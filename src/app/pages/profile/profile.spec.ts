import { TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Profile } from './profile';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { GUEST_USER, User } from '../../../models/auth';

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

describe('Profile', () => {
  let harness: RouterTestingHarness;
  const currentUser = signal<User>(GUEST_USER); // who's signed in
  let getDisplayName: ReturnType<typeof vi.fn>;
  let updateProfile: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    currentUser.set(GUEST_USER);
    getDisplayName = vi.fn(async (userId: string) => {
      if (userId === BOLA_ID) {
        return 'Bola Writes';
      }
      return null;
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
        { provide: ProfileService, useValue: { getDisplayName } },
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
    // the backend only tells us other authors' display names, so that's all that shows
    it('shows their display name only', async () => {
      await openProfile(BOLA_ID);

      expect(page().querySelector('.profile-name')?.textContent).toContain('Bola Writes');
      expect(page().querySelector('.profile-username')).toBeNull();
      expect(page().querySelector('.about-card')).toBeNull();
    });

    // a made up id, or an author we can't find, gets a proper message instead of a blank page
    it("says the profile wasn't found", async () => {
      await openProfile('6ad98c2a10ebb64e958ee000');

      expect(page().textContent).toContain('Profile not found');
      expect(page().querySelector('.profile-banner')).toBeNull();
    });

    it("says something went wrong if it couldn't be loaded", async () => {
      getDisplayName.mockRejectedValue(new Error('server down'));
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

    expect(getDisplayName).toHaveBeenCalledWith(ada._id);
    expect(page().querySelector('.profile-username')).toBeNull();
  });

  describe('bio', () => {
    beforeEach(() => currentUser.set({ ...ada, bio: 'I write mysteries.' }));

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
      expect(updateProfile).toHaveBeenCalledWith({ bio: 'I write mysteries and sci-fi.' });
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
  });
});
