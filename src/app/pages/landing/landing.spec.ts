import { ComponentFixture, TestBed } from '@angular/core/testing';
import { resource } from '@angular/core';
import { Landing } from './landing';
import { provideRouter } from '@angular/router';
import { StoryService } from '../../services/story.service';
import { StoryDetails } from '../../../models/story-details';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ReadingProgressService } from '../../services/reading-progress.service';

// fake stories for the landing page to show
const mockStories: StoryDetails[] = [
  {
    story_id: '1',
    title: 'The Lighthouse Keeper',
    author: 'Ada Lovelace',
    author_id: 'a1',
    description: 'A storm, a stranger, and three doors you should not open.',
    updatedAt: '2026-10-21T21:28:00.000Z',
  },
  {
    story_id: '2',
    title: 'Escape From Room 404',
    author: 'Ada Lovelace',
    author_id: 'a1',
    description: 'Three paths, four endings.',
    updatedAt: '2026-10-22T04:08:10.000Z',
  },
];

describe('Landing', () => {
  let component: Landing;
  let fixture: ComponentFixture<Landing>;
  let compiled: HTMLElement;

  beforeEach(async () => {
    localStorage.clear(); // reading progress is saved here, so no story starts as "in progress"
    await TestBed.configureTestingModule({
      imports: [Landing],
      providers: [
        provideHttpClient(), // the profile button uses the auth service, which needs http
        provideHttpClientTesting(), // so nothing actually gets sent to the backend
        provideRouter([]), // gives the test a router with no routes, fails otherwise as routerlink needs routes to exist
        // fake story service so the test doesnt try to get the stories from the backend
        {
          provide: StoryService,
          useValue: {
            getStories: () => resource({ defaultValue: [], loader: async () => mockStories }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Landing);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show a card for each story', () => {
    const titles = Array.from(compiled.querySelectorAll('.story-title')).map(
      (title) => title.textContent,
    );
    expect(titles).toEqual(['The Lighthouse Keeper', 'Escape From Room 404']);
  });

  it('should open the preview for a story when its card is clicked', async () => {
    const cards = compiled.querySelectorAll('.story-card');
    (cards[1] as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(compiled.querySelector('#preview-title')?.textContent).toContain('Escape From Room 404');

    // the read story link should take you to the reader for that story
    const links = Array.from(compiled.querySelectorAll('a'));
    const readLink = links.find((link) => link.textContent?.includes('Read Story'));
    expect(readLink?.getAttribute('href')).toBe('/read/2');
  });

  it('should remove the preview when it is closed', async () => {
    (compiled.querySelector('.story-card') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(compiled.querySelector('app-story-preview')).not.toBeNull();

    // the popup fires "close" when esc, the x button or the background is used
    compiled.querySelector('dialog')!.dispatchEvent(new Event('close'));
    await fixture.whenStable();

    expect(compiled.querySelector('app-story-preview')).toBeNull();
  });

  describe('continue reading', () => {
    afterEach(() => localStorage.clear());

    // the titles shown in the continue reading list
    function continueTitles() {
      return Array.from(compiled.querySelectorAll('.continue-section .story-title')).map(
        (title) => title.textContent,
      );
    }

    // a reader who hasnt started anything shouldnt see an empty section
    it('should not show the list if no stories have been started', () => {
      expect(compiled.querySelector('.continue-section')).toBeNull();
    });

    // started stories get their own list (continue reading list), with the chapter the user was last on
    it('should list the stories the reader has started', async () => {
      TestBed.inject(ReadingProgressService).save('2', { chapterIndex: 1, lineId: 4 });
      await fixture.whenStable();

      expect(continueTitles()).toEqual(['Escape From Room 404']);
      expect(compiled.querySelector('.continue-section .story-progress')?.textContent).toContain(
        'Chapter 2',
      );
      // the full list still has every story
      expect(
        compiled.querySelectorAll('.story-grid')[1].querySelectorAll('.story-card').length,
      ).toBe(2);
    });

    // the story they read last should be furthest left, even if it comes later in the full story list
    it('should put the most recently read story first', async () => {
      vi.useFakeTimers({ toFake: ['Date'] }); // so the two saves happen at different times
      const progress = TestBed.inject(ReadingProgressService);
      vi.setSystemTime(1000);
      progress.save('1', { chapterIndex: 0, lineId: 1 });
      vi.setSystemTime(2000);
      progress.save('2', { chapterIndex: 0, lineId: 1 }); // read after story 1
      vi.useRealTimers();
      await fixture.whenStable();

      expect(continueTitles()).toEqual(['Escape From Room 404', 'The Lighthouse Keeper']);
    });

    // progress saved for a story that isn't in the story list any more (deleted or unpublished) is left out
    it('should leave out started stories that are no longer listed', async () => {
      TestBed.inject(ReadingProgressService).save('gone', { chapterIndex: 0, lineId: 1 });
      await fixture.whenStable();

      expect(compiled.querySelector('.continue-section')).toBeNull();
    });

    // clicking a continue reading card opens the same preview, which then offers continue reading
    it('should open the preview with continue reading when a started story is clicked', async () => {
      TestBed.inject(ReadingProgressService).save('2', { chapterIndex: 0, lineId: 1 });
      await fixture.whenStable();

      (compiled.querySelector('.continue-section .story-card') as HTMLButtonElement).click();
      await fixture.whenStable();

      expect(compiled.querySelector('#preview-title')?.textContent).toContain(
        'Escape From Room 404',
      );
      expect(compiled.querySelector('.preview-actions')?.textContent).toContain('Continue Reading');
    });
  });
});

describe('Landing with no stories', () => {
  let compiled: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Landing],
      providers: [
        provideRouter([]),
        // same fake service as above, but this time it gives back no stories
        {
          provide: StoryService,
          useValue: {
            getStories: () => resource({ defaultValue: [], loader: async () => [] }),
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(Landing);
    compiled = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('should show a message if there are no stories', () => {
    expect(compiled.querySelectorAll('.story-card').length).toBe(0);
    expect(compiled.textContent).toContain('No stories yet so stay tuned!');
  });
});
