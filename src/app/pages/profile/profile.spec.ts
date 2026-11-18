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
  profileUrl: 'https://example.com/ada/',
  createdAt: '2026-11-02T10:00:00.000Z',
};

// another author
const BOLA_ID = '6ad98c2a10ebb64e958ee717';

describe('Profile', () => {
  let harness: RouterTestingHarness;
  const currentUser = signal<User>(GUEST_USER); // who's signed in
  let getDisplayName: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    currentUser.set(GUEST_USER);
    getDisplayName = vi.fn(async (userId: string) => {
      if (userId === BOLA_ID) {
        return 'Bola Writes';
      }
      return null;
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

    // make sure it shows display name, username and profile link
    it('shows your display name, username and profile link', async () => {
      await openProfile(ada._id);

      expect(page().querySelector('.profile-name')?.textContent).toContain('Ada Lovelace');
      expect(page().querySelector('.profile-username')?.textContent).toContain('@ada_writes');
      const link = page().querySelector<HTMLAnchorElement>('.profile-link');
      expect(link?.getAttribute('href')).toBe('https://example.com/ada/');
      expect(link?.textContent?.trim()).toBe('example.com/ada');
    });

    // new accounts don't have a profile link, so the page should properly indicate this
    it("says so when you haven't added a profile link", async () => {
      currentUser.set({ ...ada, profileUrl: '' });
      await openProfile(ada._id);
      expect(page().querySelector('.profile-link')).toBeNull();
      expect(page().textContent).toContain("You haven't added a profile link yet.");
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
});
