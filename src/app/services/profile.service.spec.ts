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
});
