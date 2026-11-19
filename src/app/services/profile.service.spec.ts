import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProfileService } from './profile.service';

const USER_ID = '6ad98c2a10ebb64e958ee717';

describe('ProfileService', () => {
  let profiles: ProfileService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    profiles = TestBed.inject(ProfileService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  const storiesRequest = `/api/v1/story?authorId=${USER_ID}&status=published&limit=100`;

  it("gets the author's published stories", async () => {
    const stories = profiles.getPublishedStories(USER_ID);
    httpTesting.expectOne(storiesRequest).flush({
      success: true,
      message: 'ok',
      data: [
        {
          _id: 's1',
          title: 'Gerald Has Your Keys',
          authorId: USER_ID,
          author: { displayName: 'Grader' },
          description: 'A goose steals your keys.',
          updatedAt: '2026-11-18T22:00:53.649Z',
        },
      ],
    });

    expect(await stories).toEqual([
      {
        story_id: 's1',
        title: 'Gerald Has Your Keys',
        author: 'Grader',
        author_id: USER_ID,
        description: 'A goose steals your keys.',
        updatedAt: '2026-11-18T22:00:53.649Z',
      },
    ]);
  });

  // nothing published means an empty list or no such user
  it("gives back no stories if they haven't published anything", async () => {
    const stories = profiles.getPublishedStories(USER_ID);
    httpTesting.expectOne(storiesRequest).flush({ success: true, message: 'ok', data: [] });
    expect(await stories).toEqual([]);
  });

  // "guest" or a typo can't be a user
  it("doesn't ask the backend about something that isn't a user id", async () => {
    expect(await profiles.getPublishedStories('guest')).toEqual([]);
    httpTesting.expectNone(() => true);
  });

  describe('public profiles', () => {
    const profileRequest = `/api/v1/user/${USER_ID}/profile`;

    it("gets someone's public profile", async () => {
      const profile = profiles.getPublicProfile(USER_ID);
      const bola = {
        _id: USER_ID,
        username: 'bola_writes',
        displayName: 'Bola Writes',
        bio: 'I write about lighthouses.',
        profileUrl: '',
        followerCount: 0,
        followingCount: 0,
        createdAt: '2026-10-05T10:00:00.000Z',
      };
      httpTesting.expectOne(profileRequest).flush({ success: true, message: 'ok', data: bola });

      expect(await profile).toEqual(bola);
    });

    // the backend sends 404 when there's no user with that id
    it("gives back null when there's no such user", async () => {
      const profile = profiles.getPublicProfile(USER_ID);
      httpTesting
        .expectOne(profileRequest)
        .flush(
          { success: false, message: 'User not found' },
          { status: 404, statusText: 'Not Found' },
        );

      expect(await profile).toBeNull();
    });

    // anything else is a problem so the page can say something went wrong
    it('throws when the server has a problem', async () => {
      const profile = profiles.getPublicProfile(USER_ID);
      httpTesting
        .expectOne(profileRequest)
        .flush({ success: false, message: 'oops' }, { status: 500, statusText: 'Server Error' });

      await expect(profile).rejects.toBeTruthy();
    });

    it("doesn't ask the backend about something that isn't a user id", async () => {
      expect(await profiles.getPublicProfile('guest')).toBeNull();
      httpTesting.expectNone(() => true);
    });
  });
});
