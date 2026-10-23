import { TestBed } from '@angular/core/testing';
import { ApplicationRef, Injector, runInInjectionContext } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { StoryService } from './story.service';

describe('StoryService', () => {
  let service: StoryService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      // provideHttpClientTesting means no real requests get sent, we answer them ourselves in the test
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(StoryService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // makes sure there are no requests left over that we didnt check
    httpTesting.verify();
  });

  // gives the resource time to send its request and get the response back
  async function waitForResource() {
    TestBed.inject(ApplicationRef).tick();
    await new Promise((resolve) => setTimeout(resolve));
  }

  // resource() only works inside an injection context (like inside a component) so we make one here
  function getFirstChapter() {
    return runInInjectionContext(TestBed.inject(Injector), () => service.getFirstChapter());
  }

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get the chapter title and lines', async () => {
    const chapter = getFirstChapter();
    await waitForResource();

    const request = httpTesting.expectOne('mock/chapter.json');
    request.flush({
      success: true,
      message: 'Chapter fetched',
      data: {
        _id: 'chapter-1',
        title: 'Chapter 1: The Vault',
        order: 0,
        contents: {
          title: 'The Clockwork Heist',
          author: 'mock-author',
          story_id: 'story-1',
          characters: {},
          story: { flags: {}, variables: [], lines: [{ line_id: 0, end: true }] },
        },
      },
    });
    await waitForResource();

    expect(chapter.value()).toEqual({
      title: 'Chapter 1: The Vault',
      lines: [{ line_id: 0, end: true }],
    });
  });

  it('should give back no lines if the chapter has no contents', async () => {
    const chapter = getFirstChapter();
    await waitForResource();

    const request = httpTesting.expectOne('mock/chapter.json');
    request.flush({
      success: true,
      message: 'Chapter fetched',
      data: { _id: 'chapter-1', title: 'Chapter 1: The Vault', order: 0, contents: null },
    });
    await waitForResource();

    expect(chapter.value()?.lines).toEqual([]);
  });

  it('should have an error if the request fails', async () => {
    const chapter = getFirstChapter();
    await waitForResource();

    const request = httpTesting.expectOne('mock/chapter.json');
    request.flush('Not found', { status: 404, statusText: 'Not Found' });
    await waitForResource();

    expect(chapter.error()).toBeTruthy();
  });

  function getStories() {
    return runInInjectionContext(TestBed.inject(Injector), () => service.getStories());
  }

  it('should get published stories with their author names', async () => {
    const stories = getStories();
    await waitForResource();

    httpTesting.expectOne('/api/v1/story').flush({
      success: true,
      message: 'ok',
      data: [
        { _id: 's1', title: 'Story 1', authorId: 'a1', description: 'd1', updatedAt: '2026-10-01' },
        { _id: 's2', title: 'Story 2', authorId: 'a1', description: 'd2', updatedAt: '2026-10-02' },
      ],
    });
    await waitForResource();

    // both stories have author a1, so only ONE user request should be sent
    httpTesting.expectOne('/api/v1/user/a1').flush({
      success: true,
      message: 'ok',
      data: { _id: 'a1', displayName: 'Lara' },
    });
    await waitForResource();

    expect(stories.value()).toEqual([
      {
        story_id: 's1',
        title: 'Story 1',
        author: 'Lara',
        description: 'd1',
        updatedAt: '2026-10-01',
      },
      {
        story_id: 's2',
        title: 'Story 2',
        author: 'Lara',
        description: 'd2',
        updatedAt: '2026-10-02',
      },
    ]);
  });

  it("should use 'Unknown author' if the name can't be matched", async () => {
    const stories = getStories();
    await waitForResource();

    httpTesting.expectOne('/api/v1/story').flush({
      success: true,
      message: 'ok',
      data: [
        { _id: 's1', title: 'Story 1', authorId: 'a1', description: 'd1', updatedAt: '2026-10-01' },
      ],
    });
    await waitForResource();

    // the user that comes back has a different id than the story's authorId, so no name matches
    httpTesting.expectOne('/api/v1/user/a1').flush({
      success: true,
      message: 'ok',
      data: { _id: 'someone-else', username: 'other', displayName: 'Other' },
    });
    await waitForResource();

    expect(stories.value()[0].author).toBe('Unknown author');
  });

  it('should send no user requests if there are no stories', async () => {
    const stories = getStories();
    await waitForResource();

    httpTesting.expectOne('/api/v1/story').flush({
      success: true,
      message: 'ok',
      data: [],
    });
    await waitForResource();

    // verify() in afterEach fails the test if any /api/v1/user request was sent
    expect(stories.value()).toEqual([]);
  });

  it('should send no user requests if there are no stories', async () => {
    const stories = getStories();
    await waitForResource();

    httpTesting.expectOne('/api/v1/story').flush({
      success: true,
      message: 'ok',
      data: [],
    });
    await waitForResource();

    // verify() in afterEach fails the test if any /api/v1/user request was sent
    expect(stories.value()).toEqual([]);
  });
});
