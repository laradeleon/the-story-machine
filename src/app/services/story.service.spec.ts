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
});
