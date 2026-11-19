import { TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Profile } from './profile';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { GUEST_USER, PublicProfile, User } from '../../../models/auth';
import { StoryDetails } from '../../../models/story-details';

// the signed in user
const ada: User = {
  ...GUEST_USER,
  _id: '6afb4da918c4151edefe4593',
  username: 'ada_writes',
  displayName: 'Ada Lovelace',
  createdAt: '2026-11-02T10:00:00.000Z',
};

// another author
const BOLA_ID = '6ad98c2a10ebb64e958ee717';

// what users can see about each of them from their public profile (shouldnt see private details like email)
const bola: PublicProfile = {
  _id: BOLA_ID,
  username: 'bola_writes',
  displayName: 'Bola Writes',
  bio: 'I write about lighthouses.',
  profileUrl: '',
  followerCount: 0,
  followingCount: 0,
  createdAt: '2026-10-05T10:00:00.000Z',
};

const adaPublic: PublicProfile = {
  ...bola,
  _id: ada._id,
  username: ada.username,
  displayName: ada.displayName,
  bio: '',
  createdAt: ada.createdAt,
};

// a published story by this author
function storyBy(authorId: string, author: string, title: string): StoryDetails {
  return {
    story_id: title.toLowerCase().replace(/ /g, '-'),
    title,
    author,
    author_id: authorId,
    description: `A story called ${title}`,
    updatedAt: '2026-11-10T10:00:00.000Z',
  };
}

const bolaStories = [
  storyBy(BOLA_ID, 'Bola Writes', 'The Lighthouse Keeper'),
  storyBy(BOLA_ID, 'Bola Writes', 'Escape From Room 404'),
];

describe('Profile', () => {
  let harness: RouterTestingHarness;
  const currentUser = signal<User>(GUEST_USER); // who's signed in
  let getPublishedStories: ReturnType<typeof vi.fn>;
  let getPublicProfile: ReturnType<typeof vi.fn>;
  let adaStories: StoryDetails[]; // ada's published stories, tests change this
  let bolaProfile: PublicProfile;
  let updateProfile: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    currentUser.set(GUEST_USER);
    adaStories = [storyBy(ada._id, 'Ada Lovelace', 'Gerald Has Your Keys')];
    bolaProfile = bola;
    // anyone we don't know about isn't found
    getPublicProfile = vi.fn(async (userId: string) => {
      if (userId === BOLA_ID) {
        return bolaProfile;
      }
      if (userId === ada._id) {
        return adaPublic;
      }
      return null;
    });
    getPublishedStories = vi.fn(async (userId: string) => {
      if (userId === BOLA_ID) {
        return bolaStories;
      }
      if (userId === ada._id) {
        return adaStories;
      }
      return [];
    });

    updateProfile = vi.fn(async (changes: Partial<User>) => {
      currentUser.update((user) => ({ ...user, ...changes }));
    });

    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'profile/:userId', component: Profile }]),
        // fake auth
        {
          provide: AuthService,
          useValue: {
            currentUser,
            isSignedIn: computed(() => currentUser()._id !== GUEST_USER._id),
            logout: () => currentUser.set(GUEST_USER),
            updateProfile,
          },
        },
        { provide: ProfileService, useValue: { getPublishedStories, getPublicProfile } },
      ],
    });
    harness = await RouterTestingHarness.create();
  });

  // opens /profile/<id> and waits for anything it has to load
  async function openProfile(userId: string) {
    await harness.navigateByUrl(`/profile/${userId}`, Profile);
    await harness.fixture.whenStable();
  }

  function page() {
    return harness.routeNativeElement as HTMLElement;
  }

  describe('your own profile', () => {
    beforeEach(() => currentUser.set(ada));

    // make sure it shows display name and username
    it('shows your display name and username', async () => {
      await openProfile(ada._id);

      expect(page().querySelector('.profile-name')?.textContent).toContain('Ada Lovelace');
      expect(page().querySelector('.profile-username')?.textContent).toContain('@ada_writes');
    });

    // default profile photo
    it('uses the same picture for everyone', async () => {
      await openProfile(ada._id);
      expect(page().querySelector('.profile-picture')?.getAttribute('src')).toBe(
        '/images/profile.png',
      );
    });
  });

  describe("someone else's profile", () => {
    it('shows their display name, username, bio and when they joined', async () => {
      await openProfile(BOLA_ID);

      expect(page().querySelector('.profile-name')?.textContent).toContain('Bola Writes');
      expect(page().querySelector('.profile-username')?.textContent).toContain('@bola_writes');
      expect(page().querySelector('.bio-text')?.textContent).toContain(
        'I write about lighthouses.',
      );
      expect(page().querySelector('.about-joined')?.textContent).toContain('October 2026');
    });

    // your own profile already comes from signing in so it shouldnt be asked for again
    it("doesn't load your own public profile", async () => {
      currentUser.set(ada);
      await openProfile(ada._id);
      expect(getPublicProfile).not.toHaveBeenCalled();
    });

    // a made up id gets a proper message instead of a blank page
    it("says the profile wasn't found", async () => {
      await openProfile('6ad98c2a10ebb64e958ee000');

      expect(page().textContent).toContain('Profile not found');
      expect(page().querySelector('.profile-banner')).toBeNull();
    });

    it("says something went wrong if it couldn't be loaded", async () => {
      getPublicProfile.mockRejectedValue(new Error('server down'));
      await openProfile(BOLA_ID);

      expect(page().textContent).toContain("this profile couldn't be loaded right now");
    });
  });

  // signing out while on your own profile turns it into the public view of it
  it('switches to the public view after signing out on your own profile', async () => {
    currentUser.set(ada);
    await openProfile(ada._id);
    expect(page().querySelector('.profile-username')).not.toBeNull();

    currentUser.set(GUEST_USER);
    await harness.fixture.whenStable();

    // still ada's page, but what anyone else would see, so no editing allowed
    expect(page().querySelector('.profile-name')?.textContent).toContain('Ada Lovelace');
    expect(page().querySelector('.profile-username')?.textContent).toContain('@ada_writes');
    expect(page().querySelector('.edit-bio-button')).toBeNull();
  });

  describe('bio', () => {
    beforeEach(() =>
      currentUser.set({
        ...ada,
        bio: 'I write mysteries.',
      }),
    );

    function button(text: string) {
      return Array.from(page().querySelectorAll('button')).find((b) =>
        b.textContent?.includes(text),
      ) as HTMLButtonElement;
    }

    // types into the bio box
    async function typeBio(text: string) {
      const box = page().querySelector<HTMLTextAreaElement>('.bio-box')!;
      box.value = text;
      box.dispatchEvent(new Event('input'));
      await harness.fixture.whenStable();
    }

    it('shows your bio', async () => {
      await openProfile(ada._id);
      expect(page().querySelector('.bio-text')?.textContent).toContain('I write mysteries.');
    });

    // new accounts start with no bio, so they get an add bio button
    it("asks you to add one when you don't have one", async () => {
      currentUser.set({ ...ada, bio: '' });
      await openProfile(ada._id);

      expect(page().textContent).toContain('Help readers get to know you by adding a bio.');
      expect(button('Add bio')).toBeTruthy();
    });

    // the main flow of bios is edit, type, save and the new bio shows straight away
    it('saves a new bio and shows it', async () => {
      await openProfile(ada._id);
      button('Edit bio').click();
      await harness.fixture.whenStable();

      // if they edit it and already have a bio,
      // the edit box should have their current bio in there
      expect(page().querySelector<HTMLTextAreaElement>('.bio-box')?.value).toBe(
        'I write mysteries.',
      );

      await typeBio('  I write mysteries and sci-fi.  ');
      button('Save').click();
      await harness.fixture.whenStable();
      expect(updateProfile).toHaveBeenCalledWith({
        bio: 'I write mysteries and sci-fi.',
      });
      expect(page().querySelector('.bio-box')).toBeNull();
      expect(page().querySelector('.bio-text')?.textContent).toContain(
        'I write mysteries and sci-fi.',
      );
    });

    it("doesn't save anything when cancelled", async () => {
      await openProfile(ada._id);
      button('Edit bio').click();
      await harness.fixture.whenStable();
      await typeBio('something else');

      button('Cancel').click();
      await harness.fixture.whenStable();

      expect(updateProfile).not.toHaveBeenCalled();
      expect(page().querySelector('.bio-text')?.textContent).toContain('I write mysteries.');
    });

    // if saving fails, the edit box stays open with what they still typed
    it('keeps the box open and says why if saving fails', async () => {
      updateProfile.mockRejectedValue(new Error('server down'));
      await openProfile(ada._id);
      button('Edit bio').click();
      await harness.fixture.whenStable();
      await typeBio('A new bio');

      button('Save').click();
      await harness.fixture.whenStable();

      expect(page().querySelector('.bio-error')?.textContent).toContain('Something went wrong');
      expect(page().querySelector<HTMLTextAreaElement>('.bio-box')?.value).toBe('A new bio');
    });

    // the backend only lets you edit your own profile so there should be no edit bio on someone elses profile
    it("can't be edited on someone else's profile", async () => {
      await openProfile(BOLA_ID);
      expect(button('Edit bio')).toBeUndefined();
      expect(button('Add bio')).toBeUndefined();
    });

    // someone else without a bio gets a message about them, not the "add a bio" note
    it("says when someone else hasn't added one", async () => {
      bolaProfile = { ...bola, bio: '' };
      await openProfile(BOLA_ID);

      expect(page().textContent).toContain("Bola Writes hasn't added a bio yet.");
      expect(page().textContent).not.toContain('Help readers get to know you');
    });
  });

  describe('stories', () => {
    // the titles on the story cards
    function cardTitles() {
      return Array.from(page().querySelectorAll('.story-title')).map((title) =>
        title.textContent?.trim(),
      );
    }

    function heading() {
      return page().querySelector('.profile-section-heading')?.textContent?.trim();
    }

    it('shows your published stories under "Your Stories"', async () => {
      currentUser.set(ada);
      await openProfile(ada._id);

      expect(heading()).toBe('Your Stories');
      expect(cardTitles()).toEqual(['Gerald Has Your Keys']);
    });

    // a new author with nothing published gets a message instead of an empty space
    it("says so when you haven't published anything yet", async () => {
      adaStories = [];
      currentUser.set(ada);
      await openProfile(ada._id);

      expect(page().textContent).toContain("You haven't published any stories yet.");
      expect(page().querySelector('app-story-card')).toBeNull();
    });

    // their profile still shows, just with a message where the stories would be
    it("says so when someone else hasn't published anything yet", async () => {
      bolaProfile = { ...bola, _id: '6ad98c2a10ebb64e958ee718' };
      getPublicProfile.mockResolvedValue(bolaProfile);
      await openProfile('6ad98c2a10ebb64e958ee718');

      expect(page().querySelector('.profile-name')?.textContent).toContain('Bola Writes');
      expect(page().textContent).toContain("Bola Writes hasn't published any stories yet.");
    });

    it("shows someone else's stories under their name", async () => {
      await openProfile(BOLA_ID);

      expect(heading()).toBe('Stories by Bola Writes');
      expect(cardTitles()).toEqual(['The Lighthouse Keeper', 'Escape From Room 404']);
    });

    // banner and about card come from signing in, so they still show if only the stories fail
    it('still shows your own profile if your stories fail to load', async () => {
      getPublishedStories.mockRejectedValue(new Error('server down'));
      currentUser.set(ada);
      await openProfile(ada._id);

      expect(page().querySelector('.profile-name')?.textContent).toContain('Ada Lovelace');
      expect(page().textContent).toContain("these stories couldn't be loaded right now");
    });

    // clicking a card works the same as on the landing page by opening the story's preview popup
    it('opens the story preview when a card is clicked', async () => {
      const realShowModal = HTMLDialogElement.prototype.showModal;
      HTMLDialogElement.prototype.showModal = vi.fn(); // the test browser can't open popups
      try {
        await openProfile(BOLA_ID);
        page().querySelectorAll<HTMLButtonElement>('.story-card')[1].click();
        await harness.fixture.whenStable();

        expect(page().querySelector('#preview-title')?.textContent).toContain(
          'Escape From Room 404',
        );
      } finally {
        HTMLDialogElement.prototype.showModal = realShowModal;
      }
    });
  });
});
