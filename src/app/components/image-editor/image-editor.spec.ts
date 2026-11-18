import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImageEditor } from './image-editor';
import { default_placement, Placement } from './placement';

describe('ImageEditor', () => {
  let fixture: ComponentFixture<ImageEditor>;
  let editor: ImageEditor;
  let compiled: HTMLElement;

  // the real showModal and close (these don't exist in the test browser, so they're undefined)
  const realShowModal = HTMLDialogElement.prototype.showModal;
  const realClose = HTMLDialogElement.prototype.close;

  // a picture the editor can show, as a data URL
  const picture = 'data:image/png;base64,eA==';

  beforeEach(async () => {
    // the test browser can't open or close popups, so we give it fake versions we can check
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();

    await TestBed.configureTestingModule({
      imports: [ImageEditor],
    }).compileComponents();

    fixture = TestBed.createComponent(ImageEditor);
    editor = fixture.componentInstance;
    fixture.componentRef.setInput('placement', { ...default_placement });
    fixture.componentRef.setInput('guide', true);
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    // put the real ones back so the fakes don't affect other tests
    HTMLDialogElement.prototype.showModal = realShowModal;
    HTMLDialogElement.prototype.close = realClose;
    vi.restoreAllMocks();
  });

  // shows a picture in the editor, the way the parent would
  function show_picture(placement: Placement = { ...default_placement }) {
    fixture.componentRef.setInput('image_url', picture);
    fixture.componentRef.setInput('placement', placement);
    fixture.detectChanges();
  }

  // finds a button by the words on it
  function button_named(text: string): HTMLButtonElement {
    return Array.from(compiled.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === text,
    ) as HTMLButtonElement;
  }

  it('should open the file picker when an empty picture area is clicked', () => {
    const picker = vi
      .spyOn(HTMLInputElement.prototype, 'click')
      .mockImplementation(() => undefined);

    (compiled.querySelector('.portrait-area') as HTMLElement).click();

    expect(picker).toHaveBeenCalled();
  });

  it('should not open the file picker when a picture is already there', () => {
    show_picture();
    const picker = vi
      .spyOn(HTMLInputElement.prototype, 'click')
      .mockImplementation(() => undefined);

    (compiled.querySelector('.portrait-area') as HTMLElement).click();

    expect(picker).not.toHaveBeenCalled();
  });

  it('should show the see-through guide when the guide is on', () => {
    expect(compiled.querySelector('.portrait-area .silhouette svg')).not.toBeNull();
  });

  it('should never show the guide when it is turned off, such as for backgrounds', () => {
    fixture.componentRef.setInput('guide', false);
    fixture.detectChanges();

    expect(compiled.querySelector('.silhouette')).toBeNull();
    expect(button_named('Hide outline')).toBeUndefined();
  });

  it('should hide the guide when the parent says the guide is not visible', () => {
    fixture.componentRef.setInput('guide_visible', false);
    fixture.detectChanges();

    expect(compiled.querySelector('.silhouette')).toBeNull();
  });

  it('should ask the parent to flip the guide when toggled', () => {
    const onToggle = vi.fn();
    editor.guide_visible_changed.subscribe(onToggle);

    editor.toggle_outline();

    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it('should keep the zoom between 50% and 300%', () => {
    const changes: Placement[] = [];
    editor.placement_changed.subscribe((p) => changes.push(p));

    editor.set_zoom('400');
    editor.set_zoom('10');
    editor.set_zoom('150');

    expect(changes.map((p) => p.zoom)).toEqual([300, 50, 150]);
  });

  it('should ignore an empty zoom box instead of jumping to 50%', () => {
    const onChange = vi.fn();
    editor.placement_changed.subscribe(onChange);

    editor.set_zoom('');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('should ignore a huge offset such as 1e400 instead of passing Infinity on', () => {
    const onChange = vi.fn();
    editor.placement_changed.subscribe(onChange);

    editor.set_offset_x('1e400');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('should show the offset and zoom in the boxes under the picture', () => {
    show_picture({ x: 10, y: -5, zoom: 150 });

    const value_of = (label: string) =>
      (compiled.querySelector(`input[aria-label="${label}"]`) as HTMLInputElement).value;
    expect(value_of('Offset X')).toBe('10');
    expect(value_of('Offset Y')).toBe('-5');
    expect(value_of('Zoom')).toBe('150');
  });

  it('should send a typed offset when its box changes', () => {
    show_picture();
    const onChange = vi.fn();
    editor.placement_changed.subscribe(onChange);

    const box = compiled.querySelector('input[aria-label="Offset X"]') as HTMLInputElement;
    box.value = '25';
    box.dispatchEvent(new Event('change'));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ x: 25 }));
  });

  it('should keep a typed offset within 100% of the area', () => {
    const changes: Placement[] = [];
    editor.placement_changed.subscribe((p) => changes.push(p));

    editor.set_offset_x('100000');
    editor.set_offset_y('-250');

    expect(changes[0].x).toBe(100);
    expect(changes[1].y).toBe(-100);
  });

  it('should keep the highlight while the pointer moves over a child of the area', () => {
    const area = compiled.querySelector('.portrait-area') as HTMLElement;
    const child = area.querySelector('.hint') as HTMLElement;
    editor.dragging.set(true);

    editor.on_drag_leave({ relatedTarget: child } as unknown as DragEvent, area);

    expect(editor.dragging()).toBe(true);
  });

  it('should drop the highlight when the pointer really leaves the area', () => {
    const area = compiled.querySelector('.portrait-area') as HTMLElement;
    editor.dragging.set(true);

    editor.on_drag_leave({ relatedTarget: document.body } as unknown as DragEvent, area);

    expect(editor.dragging()).toBe(false);
  });

  it('should pass a dropped image up to the parent', () => {
    const onChosen = vi.fn();
    editor.image_chosen.subscribe(onChosen);
    const file = new File(['x'], 'hero.png', { type: 'image/png' });

    editor.on_drop({
      preventDefault: () => undefined,
      dataTransfer: { files: [file] },
    } as unknown as DragEvent);

    expect(onChosen).toHaveBeenCalledWith(file);
  });

  it('should pass a picked image up to the parent and clear the picker', () => {
    const onChosen = vi.fn();
    editor.image_chosen.subscribe(onChosen);
    const file = new File(['x'], 'hero.png', { type: 'image/png' });
    const picker = document.createElement('input');
    Object.defineProperty(picker, 'files', { value: [file] });

    editor.on_upload(picker);

    expect(onChosen).toHaveBeenCalledWith(file);
    expect(picker.value).toBe('');
  });

  it('should highlight the area and allow the drop while a file is dragged over it', () => {
    const preventDefault = vi.fn();

    editor.on_drag_over({ preventDefault } as unknown as DragEvent);

    expect(preventDefault).toHaveBeenCalled();
    expect(editor.dragging()).toBe(true);
  });

  it('should not pass anything up when a drop has no file', () => {
    const onChosen = vi.fn();
    editor.image_chosen.subscribe(onChosen);
    editor.dragging.set(true);

    editor.on_drop({
      preventDefault: () => undefined,
      dataTransfer: { files: [] },
    } as unknown as DragEvent);

    expect(onChosen).not.toHaveBeenCalled();
    expect(editor.dragging()).toBe(false);
  });

  it('should highlight the area when a file is dragged over it in the DOM', () => {
    const area = compiled.querySelector('.portrait-area') as HTMLElement;

    area.dispatchEvent(new Event('dragover', { cancelable: true }));
    fixture.detectChanges();

    expect(area.classList).toContain('dragging');
  });

  it('should pass a file dropped on the area up in the DOM', () => {
    const onChosen = vi.fn();
    editor.image_chosen.subscribe(onChosen);
    const file = new File(['x'], 'hero.png', { type: 'image/png' });
    const drop = new Event('drop', { cancelable: true });
    Object.defineProperty(drop, 'dataTransfer', { value: { files: [file] } });

    (compiled.querySelector('.portrait-area') as HTMLElement).dispatchEvent(drop);

    expect(onChosen).toHaveBeenCalledWith(file);
  });

  describe('dragging the picture', () => {
    // a fake pointer event with the position given, and an area of a known size
    function pointer(x: number, y: number) {
      return { clientX: x, clientY: y, pointerId: 1 } as unknown as PointerEvent;
    }

    function sized_area(width: number, height: number): HTMLElement {
      const area = compiled.querySelector('.portrait-area') as HTMLElement;
      Object.defineProperty(area, 'clientWidth', { value: width });
      Object.defineProperty(area, 'clientHeight', { value: height });
      area.setPointerCapture = vi.fn();
      return area;
    }

    it('should move the picture by the pointer distance as a % of the area', () => {
      show_picture({ x: 5, y: 0, zoom: 100 });
      const area = sized_area(200, 400);
      const changes: Placement[] = [];
      editor.placement_changed.subscribe((p) => changes.push(p));

      editor.on_pointer_down(pointer(100, 100), area);
      editor.on_pointer_move(pointer(120, 140));

      // 20px of 200px is 10%, 40px of 400px is 10%, added to where the drag started
      expect(changes[0]).toEqual({ x: 15, y: 10, zoom: 100 });
      expect(area.setPointerCapture).toHaveBeenCalledWith(1);
    });

    it('should stop moving the picture once the pointer is let go', () => {
      show_picture();
      const area = sized_area(200, 400);
      const onChange = vi.fn();
      editor.placement_changed.subscribe(onChange);

      editor.on_pointer_down(pointer(0, 0), area);
      editor.on_pointer_up();
      editor.on_pointer_move(pointer(50, 50));

      expect(onChange).not.toHaveBeenCalled();
    });

    it('should not move the picture when there is no picture to drag', () => {
      const area = sized_area(200, 400);
      const onChange = vi.fn();
      editor.placement_changed.subscribe(onChange);

      editor.on_pointer_down(pointer(0, 0), area);
      editor.on_pointer_move(pointer(50, 50));

      expect(onChange).not.toHaveBeenCalled();
      expect(area.setPointerCapture).not.toHaveBeenCalled();
    });

    it('should keep a dragged picture within 100% of the area', () => {
      show_picture({ x: 90, y: -90, zoom: 100 });
      const area = sized_area(100, 100);
      const changes: Placement[] = [];
      editor.placement_changed.subscribe((p) => changes.push(p));

      editor.on_pointer_down(pointer(0, 0), area);
      editor.on_pointer_move(pointer(100, -100));

      expect(changes[0]).toMatchObject({ x: 100, y: -100 });
    });
  });

  it('should set the zoom from the slider and the offsets from their boxes in the DOM', () => {
    show_picture();
    const onChange = vi.fn();
    editor.placement_changed.subscribe(onChange);

    const slider = compiled.querySelector('input[type="range"]') as HTMLInputElement;
    slider.value = '200';
    slider.dispatchEvent(new Event('input'));

    const zoom_number = compiled.querySelector('input[aria-label="Zoom"]') as HTMLInputElement;
    zoom_number.value = '250';
    zoom_number.dispatchEvent(new Event('change'));

    const offset_y = compiled.querySelector('input[aria-label="Offset Y"]') as HTMLInputElement;
    offset_y.value = '-15';
    offset_y.dispatchEvent(new Event('change'));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ zoom: 200 }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ y: -15 }));
  });

  it('should stop dragging the picture when the pointer is released or cancelled in the DOM', () => {
    show_picture();
    const area = compiled.querySelector('.portrait-area') as HTMLElement;
    Object.defineProperty(area, 'clientWidth', { value: 200 });
    Object.defineProperty(area, 'clientHeight', { value: 400 });
    area.setPointerCapture = vi.fn();
    const onChange = vi.fn();
    editor.placement_changed.subscribe(onChange);

    const press = new Event('pointerdown');
    Object.assign(press, { clientX: 0, clientY: 0, pointerId: 1 });
    area.dispatchEvent(press);
    area.dispatchEvent(new Event('pointerup'));
    const move = new Event('pointermove');
    Object.assign(move, { clientX: 50, clientY: 50 });
    area.dispatchEvent(move);

    area.dispatchEvent(new Event('pointercancel'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('should open the file picker from the keyboard on an empty area', () => {
    const picker = vi
      .spyOn(HTMLInputElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const area = compiled.querySelector('.portrait-area') as HTMLElement;

    area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(picker).toHaveBeenCalled();
  });

  it('should pass a picked file up when the Upload input changes in the DOM', () => {
    const onChosen = vi.fn();
    editor.image_chosen.subscribe(onChosen);
    const file = new File(['x'], 'hero.png', { type: 'image/png' });
    const picker = compiled.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(picker, 'files', { value: [file] });

    picker.dispatchEvent(new Event('change'));

    expect(onChosen).toHaveBeenCalledWith(file);
  });

  it('should disable Delete image while there is no picture', () => {
    const del = button_named('Delete image');

    expect(del.disabled).toBe(true);
  });

  it('should drop the delete popup when it closes without a confirm', () => {
    show_picture();
    button_named('Delete image').click();
    fixture.detectChanges();
    expect(editor.confirm_delete_open()).toBe(true);

    // closing the popup (Cancel, Esc) fires the dialog's close event, which the parent listens for.
    // the test browser can't really close it, so the event is sent by hand
    const confirm = compiled.querySelector('app-confirm-dialog dialog') as HTMLDialogElement;
    confirm.dispatchEvent(new Event('close'));
    fixture.detectChanges();

    expect(editor.confirm_delete_open()).toBe(false);
  });

  it('should remove the picture only after the delete is confirmed', () => {
    show_picture();
    const onDeleted = vi.fn();
    editor.image_deleted.subscribe(onDeleted);

    button_named('Delete image').click();
    fixture.detectChanges();
    expect(onDeleted).not.toHaveBeenCalled();

    // the confirm popup's own Delete button
    button_named('Delete').click();
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });
});
