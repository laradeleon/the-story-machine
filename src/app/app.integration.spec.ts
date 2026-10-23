import { TestBed } from '@angular/core/testing';
import { ApplicationRef } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { routes } from './app.routes';

// integration tests: the real router, real pages and real StoryService all work together.
// the only fake part is the backend, we answer its requests ourselves with HttpTestingController
describe('Integration: finding and reading a story', () => {
  let harness: RouterTestingHarness;
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      // the real routes from app.routes.ts, not an empty list
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => {
    httpTesting.verify();
  });

  // whatever page the router is showing right now
  function page(): HTMLElement {
    return harness.routeNativeElement!;
  }

  // lets angular send requests and update the page
  async function waitForPage() {
    TestBed.inject(ApplicationRef).tick();
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.inject(ApplicationRef).tick();
  }

  // clicks the link that has this text on it
  async function clickLink(text: string) {
    const links = Array.from(page().querySelectorAll('a'));
    const link = links.find((l) => l.textContent?.includes(text)) as HTMLAnchorElement;
    link.click();
    await waitForPage();
  }

  // clicks the reader page to go to the next line
  async function clickPage() {
    const readerPage = page().querySelector('button.reader-page') as HTMLButtonElement;
    readerPage.click();
    await waitForPage();
  }

  // pretends to be the backend answering the landing page's requests
  async function answerStoryList() {
    httpTesting.expectOne('/api/v1/story').flush({
      success: true,
      message: 'ok',
      data: [
        {
          _id: 's1',
          title: 'The Lion at the Door',
          authorId: 'a1',
          description: 'Who is there?',
          updatedAt: '2026-10-20',
        },
      ],
    });
    await waitForPage();

    httpTesting.expectOne('/api/v1/user/a1').flush({
      success: true,
      message: 'ok',
      data: { _id: 'a1', username: 'lara', displayName: 'Lara' },
    });
    await waitForPage();
  }

  // pretends to be the backend answering the reader's chapter request
  async function answerChapter() {
    httpTesting.expectOne('mock/chapter.json').flush({
      success: true,
      message: 'ok',
      data: {
        _id: 'c1',
        title: 'Chapter 1: The Lion at the Door',
        order: 0,
        contents: {
          title: 'The Lion at the Door',
          author: 'a1',
          story_id: 's1',
          characters: {},
          story: {
            flags: {},
            variables: [],
            lines: [
              { line_id: 0, prose: { text: { words: ['Someone', 'knocks.'] }, text_color: null } },
              { line_id: 1, end: true },
            ],
          },
        },
      },
    });
    await waitForPage();
  }

  it('should show the stories from the backend with their author names', async () => {
    await harness.navigateByUrl('/');
    await waitForPage();
    await answerStoryList();

    expect(page().querySelector('.story-title')?.textContent).toContain('The Lion at the Door');
    expect(page().querySelector('.story-author')?.textContent).toContain('Lara');
  });

  it('should let a user pick a story and read it to the end', async () => {
    // 1. open the home page
    await harness.navigateByUrl('/');
    await waitForPage();
    await answerStoryList();

    // 2. click the story card to open the preview
    (page().querySelector('.story-card') as HTMLButtonElement).click();
    await waitForPage();
    expect(page().querySelector('#preview-title')?.textContent).toContain('The Lion at the Door');

    // 3. click read story, which should take us to the reader
    await clickLink('Read Story');
    expect(TestBed.inject(Router).url).toBe('/read/s1');

    // 4. the reader asks for the chapter
    await answerChapter();
    expect(page().textContent).toContain('Chapter 1: The Lion at the Door');

    // 5. click through the chapter
    await clickPage();
    expect(page().textContent).toContain('Someone knocks.');

    await clickPage();
    expect(page().textContent).toContain('The End.');

    // 6. go back to the stories, which loads the list again
    await clickLink('Back to stories');
    expect(TestBed.inject(Router).url).toBe('/');
    await answerStoryList();
    expect(page().querySelector('.story-title')?.textContent).toContain('The Lion at the Door');
  });

  it('should open the reader straight away if someone goes to a story link', async () => {
    // like pasting the link into the browser instead of clicking through the home page
    await harness.navigateByUrl('/read/s1');
    await waitForPage();
    await answerChapter();

    expect(page().textContent).toContain('Chapter 1: The Lion at the Door');
    // we never answered a story list request, and verify() in afterEach checks none was sent
  });

  it('should show a sorry message if the chapter could not be loaded', async () => {
    await harness.navigateByUrl('/read/s1');
    await waitForPage();

    // the backend says the chapter doesn't exist
    httpTesting.expectOne('mock/chapter.json').flush('Not found', {
      status: 404,
      statusText: 'Not Found',
    });
    await waitForPage();

    expect(page().textContent).toContain('Sorry, this chapter could not be retrieved.');
  });

  it('should show a sorry message if the stories could not be loaded', async () => {
    await harness.navigateByUrl('/');
    await waitForPage();

    // the backend is broken and sends back an error
    httpTesting.expectOne('/api/v1/story').flush('Server error', {
      status: 500,
      statusText: 'Internal Server Error',
    });
    await waitForPage();

    expect(page().textContent).toContain("Sorry, stories couldn't be loaded right now.");
    expect(page().querySelectorAll('.story-card').length).toBe(0);
  });
});
