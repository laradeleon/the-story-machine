import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, resource } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ReadingProgressService } from '../../services/reading-progress.service';
import { Reader } from './reader';
import { StoryService } from '../../services/story.service';
import { Chapter } from '../../../models/chapter';
import { ChapterNotFoundError } from '../../../models/errors';

// fake chapter used by most of the tests
// line 2 is a choice: "Open the door" goes to line 3, "Hide under the table" goes to line 6
// line 4 is a goto that skips line 5 and goes to line 8
const mockChapter: Chapter = {
  title: 'Chapter 1: The Lion at the Door',
  lines: [
    { line_id: 0, prose: { text: { words: ['The', 'fire', 'burned', 'low.'] }, text_color: null } },
    {
      line_id: 1,
      dialogue: {
        name: 'Dave',
        portrait: 'default',
        text: { words: ['Who', 'is', 'there?'] },
        text_color: null,
      },
    },
    {
      line_id: 2,
      choice: [
        { goto_line: 3, option_body: 'Open the door', condition: null },
        { goto_line: 6, option_body: 'Hide under the table', condition: null },
      ],
    },
    { line_id: 3, prose: { text: { words: ['A', 'lion', 'walks', 'in.'] }, text_color: null } },
    { line_id: 4, goto_line: 8 },
    { line_id: 5, prose: { text: { words: ['Skipped', 'line.'] }, text_color: null } },
    { line_id: 6, prose: { text: { words: ['You', 'hide.'] }, text_color: null } },
    { line_id: 7, end: true },
    {
      line_id: 8,
      dialogue: {
        name: 'Lion',
        portrait: 'default',
        text: { words: ['Hello.'] },
        text_color: null,
      },
    },
    { line_id: 9, end: true },
  ],
};

describe('Reader', () => {
  let component: Reader;
  let fixture: ComponentFixture<Reader>;
  let compiled: HTMLElement;

  // makes the reader with a fake story service so no real http request happens
  // loadChapter is what the fake service does when the reader asks for the chapter
  async function createReader(loadChapter: () => Promise<Chapter>) {
    await TestBed.configureTestingModule({
      imports: [Reader],
      providers: [
        provideRouter([]), // needed for the back to stories link on the end page
        {
          provide: StoryService,
          useValue: { getChapter: () => resource({ loader: loadChapter }) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Reader);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;
  }

  // clicks the page to go to the next line
  async function clickPage() {
    const page = compiled.querySelector('button.reader-page') as HTMLButtonElement;
    page.click();
    await fixture.whenStable();
  }

  // clicks the choice button that has this text on it
  async function pickChoice(optionText: string) {
    const buttons = Array.from(compiled.querySelectorAll('.choice-option'));
    const button = buttons.find((b) => b.textContent?.includes(optionText)) as HTMLButtonElement;
    button.click();
    await fixture.whenStable();
  }

  describe('loading', () => {
    it('should show a loading message while the chapter loads', async () => {
      // this promise never finishes so the chapter stays loading
      await createReader(() => new Promise(() => undefined));
      fixture.detectChanges();
      expect(compiled.textContent).toContain('Loading in chapter');
    });

    it('should show an error message if the chapter fails to load', async () => {
      await createReader(() => Promise.reject(new Error('could not load')));
      await fixture.whenStable();
      expect(compiled.textContent).toContain('Sorry, this chapter could not be retrieved.');
    });

    // testing Chapter error
    it('should say the story has no chapters if the chapter is missing', async () => {
      await createReader(() => Promise.reject(new ChapterNotFoundError('s1', 0)));
      await fixture.whenStable();
      expect(compiled.textContent).toContain("This story doesn't have any chapters yet.");
      expect(compiled.textContent).not.toContain('Sorry, this chapter could not be retrieved.');
    });
  });

  describe('reading the chapter', () => {
    beforeEach(async () => {
      await createReader(async () => mockChapter);
      await fixture.whenStable();
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should start on the chapter title', () => {
      expect(compiled.querySelector('.chapter-title')?.textContent).toContain(
        'Chapter 1: The Lion at the Door',
      );
    });

    it('should show the first line after clicking the title page', async () => {
      await clickPage();
      expect(compiled.querySelector('.dialogue-box')?.textContent).toContain(
        'The fire burned low.',
      );
    });

    it('should not show a speaker name for prose', async () => {
      await clickPage();
      expect(compiled.querySelector('.speaker-name')).toBeNull();
    });

    it('should show the speaker name for dialogue', async () => {
      await clickPage(); // line 0
      await clickPage(); // line 1
      expect(compiled.querySelector('.speaker-name')?.textContent).toContain('Dave');
      expect(compiled.querySelector('.dialogue-box')?.textContent).toContain('Who is there?');
    });
  });

  describe('choices', () => {
    beforeEach(async () => {
      await createReader(async () => mockChapter);
      await fixture.whenStable();
      // go from the title page to the choice on line 2
      await clickPage();
      await clickPage();
      await clickPage();
    });

    it('should show all the options with numbers', () => {
      const options = Array.from(compiled.querySelectorAll('.choice-option')).map((option) =>
        option.textContent?.replace(/\s+/g, ' ').trim(),
      );
      expect(options).toEqual(['1. Open the door', '2. Hide under the table']);
    });

    it('should show the line before the choice above the options', () => {
      expect(compiled.querySelector('.speaker-name')?.textContent).toContain('Dave');
      expect(compiled.querySelector('.dialogue-box')?.textContent).toContain('Who is there?');
    });

    it('should not let the user skip the choice by clicking the page', () => {
      // on the choice page the page itself isnt a button so there's nothing to click
      expect(compiled.querySelector('button.reader-page')).toBeNull();
    });

    it('should go to the line the option points to', async () => {
      await pickChoice('Hide under the table');
      expect(compiled.querySelector('.dialogue-box')?.textContent).toContain('You hide.');
    });

    it('should go down a different path for the other option', async () => {
      await pickChoice('Open the door');
      expect(compiled.querySelector('.dialogue-box')?.textContent).toContain('A lion walks in.');
    });
  });

  describe('goto lines', () => {
    it('should skip over a goto line and show the line it points to', async () => {
      await createReader(async () => mockChapter);
      await fixture.whenStable();
      await clickPage();
      await clickPage();
      await clickPage();
      await pickChoice('Open the door'); // line 3
      await clickPage(); // line 4 is a goto to line 8

      expect(compiled.querySelector('.speaker-name')?.textContent).toContain('Lion');
      expect(compiled.textContent).not.toContain('Skipped line.');
    });

    it('should keep jumping when a goto points to another goto', async () => {
      await createReader(async () => ({
        title: 'Two gotos',
        lines: [
          { line_id: 0, goto_line: 1 },
          { line_id: 1, goto_line: 2 },
          { line_id: 2, prose: { text: { words: ['Made', 'it.'] }, text_color: null } },
        ],
      }));
      await fixture.whenStable();
      await clickPage();
      expect(compiled.querySelector('.dialogue-box')?.textContent).toContain('Made it.');
    });

    it('should not get stuck when two gotos point at each other', async () => {
      await createReader(async () => ({
        title: 'Goto loop',
        lines: [
          { line_id: 0, goto_line: 1 },
          { line_id: 1, goto_line: 0 },
        ],
      }));
      await fixture.whenStable();
      await clickPage(); // this would never finish if the reader got stuck in the loop
      expect(compiled.textContent).toContain('The End.');
    });
  });

  describe('end of the chapter', () => {
    it('should show the end page and a link back to the stories', async () => {
      await createReader(async () => mockChapter);
      await fixture.whenStable();
      await clickPage();
      await clickPage();
      await clickPage();
      await pickChoice('Hide under the table'); // line 6
      await clickPage(); // line 7 is the end

      expect(compiled.textContent).toContain('The End.');
      const backLink = compiled.querySelector('a');
      expect(backLink?.textContent).toContain('Back to stories');
      expect(backLink?.getAttribute('href')).toBe('/');
    });

    it('should show the end page after the last line even without an end line', async () => {
      await createReader(async () => ({
        title: 'No end line',
        lines: [{ line_id: 0, prose: { text: { words: ['Last', 'line.'] }, text_color: null } }],
      }));
      await fixture.whenStable();
      await clickPage(); // line 0
      await clickPage(); // past the last line
      expect(compiled.textContent).toContain('The End.');
    });

    it('should show a next chapter button instead of the end if there is another chapter', async () => {
      await createReader(async () => ({
        title: 'Chapter 1',
        lines: [{ line_id: 0, end: true }],
        hasNextChapter: true,
      }));
      await fixture.whenStable();
      await clickPage(); // line 0 is the end

      expect(compiled.textContent).toContain('End of chapter.');
      expect(compiled.textContent).not.toContain('The End.');
      const nextButton = Array.from(compiled.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Next Chapter'),
      );
      expect(nextButton).toBeTruthy();
    });

    it('should show the end page if the chapter has no lines', async () => {
      await createReader(async () => ({ title: 'Empty chapter', lines: [] }));
      await fixture.whenStable();
      await clickPage();
      expect(compiled.textContent).toContain('The End.');
    });
  });

  it('should not show a prompt if the choice is the first line', async () => {
    await createReader(async () => ({
      title: 'Choice first',
      lines: [
        { line_id: 0, choice: [{ goto_line: 1, option_body: 'Go left', condition: null }] },
        { line_id: 1, end: true },
      ],
    }));
    await fixture.whenStable();
    await clickPage();
    expect(compiled.querySelectorAll('.choice-option').length).toBe(1);
    expect(compiled.querySelector('.dialogue-box')).toBeNull();
  });
});

// stands in for the story list so there's somewhere for the exit button to go
@Component({ template: '' })
class StoryListStandIn {}

describe('Reader progress and exit', () => {
  let harness: RouterTestingHarness;
  let progress: ReadingProgressService;

  //the actual elements to put back after the test
  const realShowModal = HTMLDialogElement.prototype.showModal;
  const realClose = HTMLDialogElement.prototype.close;

  beforeEach(async () => {
    localStorage.clear();
    // fake versions of the popup
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.dispatchEvent(new Event('close'));
    });

    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'read/:storyId', component: Reader },
          { path: '', component: StoryListStandIn },
        ]),
        // fake story service
        {
          provide: StoryService,
          useValue: { getChapter: () => resource({ loader: async () => mockChapter }) },
        },
      ],
    });
    progress = TestBed.inject(ReadingProgressService);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => {
    HTMLDialogElement.prototype.showModal = realShowModal;
    HTMLDialogElement.prototype.close = realClose;
    localStorage.clear();
  });

  // opens story s1
  async function openStory() {
    await harness.navigateByUrl('/read/s1', Reader);
    await harness.fixture.whenStable();
  }

  // leaves the story and opens it again
  async function reopenStory() {
    await harness.navigateByUrl('/');
    await openStory();
  }

  function page() {
    return harness.routeNativeElement as HTMLElement;
  }

  async function clickPage() {
    (page().querySelector('button.reader-page') as HTMLButtonElement).click();
    await harness.fixture.whenStable();
  }

  async function pickChoice(optionText: string) {
    const buttons = Array.from(page().querySelectorAll('.choice-option'));
    (buttons.find((b) => b.textContent?.includes(optionText)) as HTMLButtonElement).click();
    await harness.fixture.whenStable();
  }

  async function pressKey(key: string) {
    document.dispatchEvent(new KeyboardEvent('keydown', { key }));
    await harness.fixture.whenStable();
  }

  // finds a button in the exit popup by its text, using this to find "Keep reading" button
  function popupButton(text: string) {
    return Array.from(page().querySelectorAll('dialog button')).find((b) =>
      b.textContent?.includes(text),
    ) as HTMLButtonElement;
  }

  describe('remembering progress', () => {
    // progress is saved on every page turn, not only when they leave,
    it('saves where the reader is as they read', async () => {
      await openStory();
      await clickPage(); // line 0
      await clickPage(); // line 1

      expect(progress.get('s1')).toEqual({ chapterIndex: 0, lineId: 1 });
    });

    // main functionality is to leave partway through, come back, and land on the same page
    it('opens the story where the reader left off', async () => {
      await openStory();
      await clickPage(); // line 0
      await clickPage(); // line 1

      await reopenStory();

      expect(page().querySelector('.dialogue-box')?.textContent).toContain('Who is there?');
    });

    // after a choice the story has branched, so coming back has to keep them on the branch they picked
    // not put them back on the choice or down another path
    it('opens on the same path after a choice', async () => {
      await openStory();
      await clickPage(); // line 0
      await clickPage(); // line 1
      await clickPage(); // the choice on line 2
      await pickChoice('Hide under the table'); // line 6

      await reopenStory();
      expect(page().querySelector('.dialogue-box')?.textContent).toContain('You hide.');
    });

    // once they've finished, there's nothing to resume, so opening it again starts from the beginning
    it('opens from the beginning after finishing the story', async () => {
      progress.save('s1', { chapterIndex: 0, lineId: 6 }); // one page before the end
      await openStory();
      await clickPage(); // line 7 is the end

      expect(page().textContent).toContain('The End.');
      expect(progress.get('s1')).toBeNull();
    });

    // the author can edit a story after someone has started it
    // if the line they were on got deleted, the reader should start the chapter again rather than show a broken page
    it('starts the chapter again if the saved line no longer exists', async () => {
      progress.save('s1', { chapterIndex: 0, lineId: 50 }); // mock chapter only has 10 lines
      await openStory();

      // back on the chapter's title page
      expect(page().querySelector('.chapter-title')?.textContent).toContain(
        'Chapter 1: The Lion at the Door',
      );
    });
  });

  describe('exiting', () => {
    it('asks before leaving when the Exit button is clicked', async () => {
      await openStory();
      page().querySelector<HTMLButtonElement>('.exit-button')?.click();
      await harness.fixture.whenStable();

      expect(page().textContent).toContain('Exit this story?');
      expect(page().textContent).toContain('Your progress is saved');
    });

    it('asks before leaving when Esc is pressed', async () => {
      await openStory();
      await pressKey('Escape');

      expect(page().textContent).toContain('Exit this story?');
    });

    it('goes back to the story list after choosing Exit', async () => {
      await openStory();
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
      await pressKey('Escape');
      popupButton('Exit').click();

      expect(navigate).toHaveBeenCalledWith(['/']);
    });

    it('stays on the same page after choosing Keep reading', async () => {
      await openStory();
      await clickPage(); // line 0
      await pressKey('Escape');
      popupButton('Keep reading').click();
      await harness.fixture.whenStable();

      expect(page().textContent).not.toContain('Exit this story?');
      expect(page().querySelector('.dialogue-box')?.textContent).toContain('The fire burned low.');
    });

    it("doesn't move the story on while the popup is open", async () => {
      await openStory();
      await pressKey('Escape');
      await pressKey(' ');

      expect(page().querySelector('.chapter-title')?.textContent).toContain(
        'Chapter 1: The Lion at the Door',
      );
    });
  });
});
