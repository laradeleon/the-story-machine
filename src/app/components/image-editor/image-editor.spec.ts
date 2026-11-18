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
