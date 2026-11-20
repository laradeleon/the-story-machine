import { ComponentFixture, TestBed } from '@angular/core/testing';
import { computed, resource, signal } from '@angular/core';
import { Landing, NEW_STORY_TITLE } from './landing';
import { provideRouter, Router } from '@angular/router';
import { StoryService } from '../../services/story.service';
import { AuthService } from '../../services/auth.service';
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

describe('Landing Write Story', () => {
  let fixture: ComponentFixture<Landing>;
  let compiled: HTMLElement;
  const signedIn = signal(true);
  const postStory = vi.fn();

  const realShowModal = HTMLDialogElement.prototype.showModal;

  beforeEach(async () => {
    HTMLDialogElement.prototype.showModal = vi.fn(); // the sign in popup opens with this
    signedIn.set(true);
    postStory.mockReset();

    await TestBed.configureTestingModule({
      imports: [Landing],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isSignedIn: signedIn,
            currentUser: computed(() => ({ username: 'ada', email: '' })),
          },
        },
        {
          provide: StoryService,
          useValue: {
            getStories: () => resource({ defaultValue: [], loader: async () => [] }),
            postStory,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Landing);
    compiled = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  afterEach(() => {
    HTMLDialogElement.prototype.showModal = realShowModal;
  });

  function write_button() {
    return compiled.querySelector('.write-story-button') as HTMLButtonElement;
  }

  // lets write_story() finish after its faked request, then shows the result
  async function settle() {
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
  }

  it('should make a new story and open it in the writer', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    // held until the test lets it finish, so the button can be checked while it's creating
    let finish!: (story: { _id: string }) => void;
    postStory.mockReturnValue(new Promise((resolve) => (finish = resolve)));

    write_button().click();
    fixture.detectChanges();
    expect(write_button().disabled).toBe(true);
    expect(write_button().textContent).toContain('Creating...');

    finish({ _id: 'new-id' });
    await settle();

    expect(postStory).toHaveBeenCalledWith(NEW_STORY_TITLE, '');
    expect(navigate).toHaveBeenCalledWith(['/write', 'new-id']);
  });

  it('should show an error and let them try again if the story cannot be made', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    postStory.mockRejectedValue(new Error('Server Error'));

    write_button().click();
    await settle();

    expect(compiled.querySelector('.create-error')).not.toBeNull();
    expect(write_button().disabled).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('should ask guests to sign in instead of making a story', async () => {
    signedIn.set(false);
    await fixture.whenStable();

    write_button().click();
    await fixture.whenStable();

    expect(postStory).not.toHaveBeenCalled();
    expect(compiled.querySelector('app-sign-in-popup #sign-in-title')).not.toBeNull();
  });
});

describe('Landing profile menu', () => {
  let fixture: ComponentFixture<Landing>;
  let compiled: HTMLElement;
  // fake auth service so each test can pick who is signed in
  const signedInUser = signal<{ username: string; email: string } | null>(null);
  const auth = {
    isSignedIn: computed(() => signedInUser() !== null),
    currentUser: computed(() => signedInUser() ?? { username: 'guest', email: '' }),
    logout: vi.fn(() => signedInUser.set(null)),
  };

  // the real showModal (doesn't exist in the test browser)
  const realShowModal = HTMLDialogElement.prototype.showModal;

  beforeEach(async () => {
    HTMLDialogElement.prototype.showModal = vi.fn(); // the sign in popup opens with this
    signedInUser.set(null);
    auth.logout.mockClear();

    await TestBed.configureTestingModule({
      imports: [Landing],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        {
          provide: StoryService,
          useValue: {
            getStories: () => resource({ defaultValue: [], loader: async () => [] }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Landing);
    compiled = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  afterEach(() => {
    HTMLDialogElement.prototype.showModal = realShowModal;
  });

  function profileButton() {
    return compiled.querySelector('.profile-button') as HTMLButtonElement;
  }

  function menuButton(text: string) {
    const buttons = Array.from(compiled.querySelectorAll('.profile-dropdown button'));
    return buttons.find((button) => button.textContent?.trim() === text) as HTMLButtonElement;
  }

  async function openMenu() {
    profileButton().click();
    await fixture.whenStable();
  }

  async function signInAs(username: string, email = 'ada@example.com') {
    signedInUser.set({ username, email });
    await fixture.whenStable();
  }

  it('should say "Guest" before anyone signs in', () => {
    expect(profileButton().textContent).toContain('Guest');
  });

  it('should open and close the menu when the button is clicked', async () => {
    await openMenu();
    expect(compiled.querySelector('.profile-dropdown')).not.toBeNull();
    expect(profileButton().getAttribute('aria-expanded')).toBe('true');

    await openMenu();
    expect(compiled.querySelector('.profile-dropdown')).toBeNull();
  });

  it('should close the menu when clicking somewhere else or pressing Esc', async () => {
    await openMenu();
    compiled.querySelector('.hero')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();
    expect(compiled.querySelector('.profile-dropdown')).toBeNull();

    await openMenu();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();
    expect(compiled.querySelector('.profile-dropdown')).toBeNull();
  });

  it('should give guests the sign in and create account options', async () => {
    await openMenu();
    expect(menuButton('Sign in')).toBeTruthy();
    expect(menuButton('Create account')).toBeTruthy();
    expect(menuButton('Sign out')).toBeUndefined();
  });

  it('should open the popup on the form that was picked', async () => {
    await openMenu();
    menuButton('Create account').click();
    await fixture.whenStable();

    expect(compiled.querySelector('.profile-dropdown')).toBeNull(); // the menu closes
    expect(compiled.querySelector('app-sign-in-popup #sign-in-title')?.textContent).toContain(
      'Create an account',
    );
  });

  it('should show the username on the button and the account in the menu once signed in', async () => {
    await signInAs('ada');
    expect(profileButton().textContent).toContain('ada');

    await openMenu();
    expect(compiled.querySelector('.profile-details-name')?.textContent).toBe('ada');
    expect(compiled.querySelector('.profile-details-email')?.textContent).toBe('ada@example.com');
    expect(menuButton('Sign in')).toBeUndefined();
  });

  it('should shorten long usernames on the button but show the full name when hovered', async () => {
    await signInAs('averyverylongname');
    expect(profileButton().textContent).toContain('averyvery…');
    expect(profileButton().getAttribute('title')).toBe('averyverylongname');
  });

  it('should sign out and go back to "Guest"', async () => {
    await signInAs('ada');
    await openMenu();
    menuButton('Sign out').click();
    await fixture.whenStable();

    expect(auth.logout).toHaveBeenCalled();
    expect(profileButton().textContent).toContain('Guest');
    expect(compiled.querySelector('.profile-dropdown')).toBeNull();
  });
});
