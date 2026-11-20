import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StoryPreview } from './story-preview';
import { provideRouter, Router } from '@angular/router';
import { ReadingProgressService } from '../../services/reading-progress.service';

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
      providers: [provideRouter([])], // the read story link needs a router to exist
    }).compileComponents();

    fixture = TestBed.createComponent(StoryPreview);
    fixture.componentRef.setInput('story', {
      story_id: '1',
      title: 'Test story',
      author: 'Test author',
      author_id: 'a1',
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

describe('StoryPreview author link', () => {
  const realShowModal = HTMLDialogElement.prototype.showModal;

  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = vi.fn();
  });

  afterEach(() => {
    HTMLDialogElement.prototype.showModal = realShowModal;
  });

  // clicking the author's name should take you to their profile
  it("should link the author's name to their profile", async () => {
    await TestBed.configureTestingModule({
      imports: [StoryPreview],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(StoryPreview);
    fixture.componentRef.setInput('story', {
      story_id: '1',
      title: 'Test story',
      author: 'Test author',
      author_id: 'a1',
      description: 'A test description',
      updatedAt: '2026-10-19T11:03:46.435Z',
    });
    await fixture.whenStable();

    const link = (fixture.nativeElement as HTMLElement).querySelector('.author-link');
    expect(link?.textContent).toContain('Test author');
    expect(link?.getAttribute('href')).toBe('/profile/a1');
  });
});

describe('StoryPreview reading buttons', () => {
  let fixture: ComponentFixture<StoryPreview>;
  let compiled: HTMLElement;
  let progress: ReadingProgressService;

  const realShowModal = HTMLDialogElement.prototype.showModal;

  beforeEach(async () => {
    localStorage.clear();
    HTMLDialogElement.prototype.showModal = vi.fn();

    await TestBed.configureTestingModule({
      imports: [StoryPreview],
      providers: [provideRouter([])],
    }).compileComponents();
    progress = TestBed.inject(ReadingProgressService);
  });

  afterEach(() => {
    HTMLDialogElement.prototype.showModal = realShowModal;
    localStorage.clear();
  });

  // shows the popup for story "1" (popup from clicking story on landing oage)
  async function openPreview() {
    fixture = TestBed.createComponent(StoryPreview);
    fixture.componentRef.setInput('story', {
      story_id: '1',
      title: 'Test story',
      author: 'Test author',
      author_id: 'a1',
      description: 'A test description',
      updatedAt: '2026-10-19T11:03:46.435Z',
    });
    compiled = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  }

  // the text of every button and link at the bottom of the popup
  function actions() {
    return Array.from(compiled.querySelectorAll('.preview-actions > *')).map((el) =>
      el.textContent?.trim(),
    );
  }

  // someone who hasnt opened the story just gets the one button for Read Story
  it('should show read story for a story the reader has not started', async () => {
    await openPreview();
    expect(actions()).toEqual(['Read Story']);
  });

  // someone whos partway through gets to pick between picking up where they were or starting again
  it('should offer continue reading and start over for a story the reader has started', async () => {
    progress.save('1', { chapterIndex: 0, lineId: 3 });
    await openPreview();

    expect(actions()).toEqual(['Continue Reading', 'Start Over']);
    // continue reading goes to the same reader link which opens at their saved place
    const continueLink = compiled.querySelector('.preview-actions a');
    expect(continueLink?.getAttribute('href')).toBe('/read/1');
  });

  // start over has to wipe the saved place before opening
  it('should forget the saved place and open the story when start over is clicked', async () => {
    progress.save('1', { chapterIndex: 1, lineId: 3 });
    await openPreview();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    const startOver = Array.from(compiled.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Start Over'),
    ) as HTMLButtonElement;
    startOver.click();

    expect(progress.get('1')).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/read', '1']);
  });
});
