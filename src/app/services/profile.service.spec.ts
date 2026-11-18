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

  // request for published stories
  const storiesRequest = `/api/v1/story?authorId=${USER_ID}&status=published&limit=1`;

  // there's no public user endpoint, so the name comes from one of their published stories
  it("gets the author's display name from one of their published stories", async () => {
    const name = profiles.getDisplayName(USER_ID);
    httpTesting.expectOne(storiesRequest).flush({
      success: true,
      message: 'ok',
      data: [{ _id: 's1', authorId: USER_ID, author: { displayName: 'Bola Writes' } }],
    });
    expect(await name).toBe('Bola Writes');
  });

  // no published stories means no name to show or no user exists
  it("gives back null if they haven't published anything", async () => {
    const name = profiles.getDisplayName(USER_ID);
    httpTesting.expectOne(storiesRequest).flush({ success: true, message: 'ok', data: [] });
    expect(await name).toBeNull();
  });

  // "guest" or a typo can't be a user
  it("doesn't ask the backend about something that isn't a user id", async () => {
    expect(await profiles.getDisplayName('guest')).toBeNull();
    httpTesting.expectNone(() => true);
  });
});
