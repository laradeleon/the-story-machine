import { ComponentFixture, TestBed } from '@angular/core/testing';
import { resource } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Reader } from './reader';
import { StoryService } from '../../services/story.service';
import { Chapter } from '../../../models/chapter';

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
          useValue: { getFirstChapter: () => resource({ loader: loadChapter }) },
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
