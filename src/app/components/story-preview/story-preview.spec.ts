import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StoryPreview } from './story-preview';
import { provideRouter } from '@angular/router';

describe('StoryPreview closing', () => {
  let component: StoryPreview;
  let fixture: ComponentFixture<StoryPreview>;
  let compiled: HTMLElement;
  let dialog: HTMLDialogElement;

  // the real showModal and close (these don't exist in the test browser, so they're undefined)
  const realShowModal = HTMLDialogElement.prototype.showModal;
  const realClose = HTMLDialogElement.prototype.close;

  beforeEach(async () => {
    // the test browser can't open or close popups, so we give it fake versions we can check
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();

    await TestBed.configureTestingModule({
      imports: [StoryPreview],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(StoryPreview);
    fixture.componentRef.setInput('story', {
      story_id: '1',
      title: 'Test story',
      author: 'Test author',
      description: 'A test description',
      updatedAt: '2026-10-19T11:03:46.435Z',
    });
    component = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();

    dialog = compiled.querySelector('dialog')!;

    // the test browser doesn't know where things are on the screen either,
    // so we pretend the popup is a box from 100 to 300 (left to right and top to bottom)
    const fakeBox = { left: 100, right: 300, top: 100, bottom: 300 } as DOMRect;
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue(fakeBox);
  });

  afterEach(() => {
    // put the real ones back so the fakes don't affect other tests
    HTMLDialogElement.prototype.showModal = realShowModal;
    HTMLDialogElement.prototype.close = realClose;
  });

  // presses the mouse button down at (x, y)
  function mouseDownAt(x: number, y: number) {
    dialog.dispatchEvent(new MouseEvent('mousedown', { clientX: x, clientY: y }));
  }

  // lets go of the mouse button at (x, y), which counts as a click
  function clickAt(x: number, y: number) {
    dialog.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y }));
  }

  it('should open as a popup when it first appears', () => {
    expect(dialog.showModal).toHaveBeenCalled();
  });

  it('should close when you click outside the popup', () => {
    // (10, 10) is outside the box
    mouseDownAt(10, 10);
    clickAt(10, 10);

    expect(dialog.close).toHaveBeenCalled();
  });

  it('should close when you click to the right, above or below the popup', () => {
    // right of the box
    mouseDownAt(400, 200);
    clickAt(400, 200);

    // above the box
    mouseDownAt(200, 50);
    clickAt(200, 50);

    // below the box
    mouseDownAt(200, 400);
    clickAt(200, 400);

    expect(dialog.close).toHaveBeenCalledTimes(3);
  });

  it('should not close when you click inside the popup', () => {
    // (200, 200) is inside the box
    mouseDownAt(200, 200);
    clickAt(200, 200);

    expect(dialog.close).not.toHaveBeenCalled();
  });

  it('should not close when you drag from inside the popup to outside', () => {
    mouseDownAt(200, 200); // start inside
    clickAt(10, 10); // let go outside

    expect(dialog.close).not.toHaveBeenCalled();
  });

  it('should not close when you drag from outside the popup to inside', () => {
    mouseDownAt(10, 10); // start outside
    clickAt(200, 200); // let go inside

    expect(dialog.close).not.toHaveBeenCalled();
  });

  it('should not close when you click on text inside the popup', () => {
    // this time the click lands on the description, not on the dialog itself
    const description = compiled.querySelector('.preview-description')!;
    description.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, clientX: 10, clientY: 10 }),
    );
    description.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 10, clientY: 10 }));

    expect(dialog.close).not.toHaveBeenCalled();
  });

  it('should close when the x button is clicked', () => {
    const xButton = compiled.querySelector('.close-button') as HTMLButtonElement;
    xButton.click();

    expect(dialog.close).toHaveBeenCalled();
  });

  it('should tell the landing page when it closes', () => {
    // a fake function that remembers if it was called
    const onClosed = vi.fn();
    component.closed.subscribe(onClosed);

    // the browser fires a "close" event whenever the popup closes
    dialog.dispatchEvent(new Event('close'));

    expect(onClosed).toHaveBeenCalled();
  });
});
