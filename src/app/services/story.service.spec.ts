import { TestBed } from '@angular/core/testing';
import { ApplicationRef, Injector, runInInjectionContext } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { StoryService } from './story.service';
import { ChapterNotFoundError } from '../../models/errors';

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
  function getChapter(storyId: string, chapterIndex: number) {
    return runInInjectionContext(TestBed.inject(Injector), () =>
      service.getChapter(
        () => storyId,
        () => chapterIndex,
      ),
    );
  }

  // pretends to be the backend answering the list of chapters for story s1 (two chapters)
  async function answerChapterList() {
    httpTesting.expectOne('/api/v1/story/s1/chapter').flush({
      success: true,
      message: 'Chapters fetched',
      data: [
        {
          title: 'The Clockwork Heist',
          author: 'mock-author',
          story_id: 's1',
          chapter_id: 'c1',
          chapter_name: 'Chapter 1: The Vault',
        },
        {
          title: 'The Clockwork Heist',
          author: 'mock-author',
          story_id: 's1',
          chapter_id: 'c2',
          chapter_name: 'Chapter 2: The Escape',
        },
      ],
    });
    await waitForResource();
  }

  // the single chapter response, with these lines in its script
  function chapterResponse(chapterId: string, chapterName: string, lines: object[]) {
    return {
      success: true,
      message: 'Chapter fetched',
      data: {
        title: 'The Clockwork Heist',
        author: 'mock-author',
        story_id: 's1',
        chapter_id: chapterId,
        chapter_name: chapterName,
        characters: {},
        story: { flags: {}, variables: [], lines },
      },
    };
  }

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get the first chapter title and lines', async () => {
    const chapter = getChapter('s1', 0);
    await waitForResource();
    await answerChapterList();

    httpTesting
      .expectOne('/api/v1/story/s1/chapter/c1')
      .flush(chapterResponse('c1', 'Chapter 1: The Vault', [{ line_id: 0, end: true }]));
    await waitForResource();

    expect(chapter.value()).toEqual({
      title: 'Chapter 1: The Vault',
      lines: [{ line_id: 0, end: true }],
      hasNextChapter: true,
    });
  });

  it('should get a later chapter and know it is the last one', async () => {
    const chapter = getChapter('s1', 1);
    await waitForResource();
    await answerChapterList();

    httpTesting
      .expectOne('/api/v1/story/s1/chapter/c2')
      .flush(chapterResponse('c2', 'Chapter 2: The Escape', []));
    await waitForResource();

    expect(chapter.value()?.title).toBe('Chapter 2: The Escape');
    expect(chapter.value()?.hasNextChapter).toBe(false);
  });

  it('should give back no lines if the chapter has no script yet', async () => {
    const chapter = getChapter('s1', 0);
    await waitForResource();
    await answerChapterList();

    httpTesting
      .expectOne('/api/v1/story/s1/chapter/c1')
      .flush(chapterResponse('c1', 'Chapter 1: The Vault', []));
    await waitForResource();

    expect(chapter.value()?.lines).toEqual([]);
  });

  it('should have an error if the story has no chapter at that position', async () => {
    const chapter = getChapter('s1', 5);
    await waitForResource();
    await answerChapterList(); // only two chapters, so there is no chapter 6 to request

    expect(chapter.error()).toBeInstanceOf(ChapterNotFoundError);
  });

  it('should have an error if the request fails', async () => {
    const chapter = getChapter('s1', 0);
    await waitForResource();

    httpTesting
      .expectOne('/api/v1/story/s1/chapter')
      .flush('Not found', { status: 404, statusText: 'Not Found' });
    await waitForResource();

    expect(chapter.error()).toBeTruthy();
    expect(chapter.error()).not.toBeInstanceOf(ChapterNotFoundError);
  });

  function getStories() {
    return runInInjectionContext(TestBed.inject(Injector), () => service.getStories());
  }

  it('should get published stories with their author names', async () => {
    const stories = getStories();
    await waitForResource();

    httpTesting.expectOne('/api/v1/story?status=published').flush({
      success: true,
      message: 'ok',
      data: [
        {
          _id: 's1',
          title: 'Story 1',
          authorId: 'a1',
          author: { displayName: 'Lara' },
          description: 'd1',
          updatedAt: '2026-10-01',
        },
        {
          _id: 's2',
          title: 'Story 2',
          authorId: 'a1',
          author: { displayName: 'Lara' },
          description: 'd2',
          updatedAt: '2026-10-02',
        },
      ],
    });
    await waitForResource();

    // the name comes with each story
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

  it("should use 'Unknown author' if the story has no author name", async () => {
    const stories = getStories();
    await waitForResource();

    // no author object on the story
    httpTesting.expectOne('/api/v1/story?status=published').flush({
      success: true,
      message: 'ok',
      data: [
        { _id: 's1', title: 'Story 1', authorId: 'a1', description: 'd1', updatedAt: '2026-10-01' },
      ],
    });
    await waitForResource();

    expect(stories.value()[0].author).toBe('Unknown author');
  });

  it('should give back no stories if there are none published', async () => {
    const stories = getStories();
    await waitForResource();

    httpTesting.expectOne('/api/v1/story?status=published').flush({
      success: true,
      message: 'ok',
      data: [],
    });
    await waitForResource();

    // verify() in afterEach fails the test if any /api/v1/user request was sent
    expect(stories.value()).toEqual([]);
  });
});
