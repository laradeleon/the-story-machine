import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Reader } from './pages/reader/reader';
import Parser from '../scripting_language/parser.ts';
import { toJSON } from '../scripting_language/to_json.ts';
import { simpleStory, tresspassing } from '../scripting_language/examples/stories.ts';
import { APIResponse, ChapterResponse } from '../models/api';
import { StoryInfo, StoryJSON } from '../models/story';
import { MOCK_CHAPTER_URL } from './services/story.service';

//runs a script through the whole pipeline (lexer -> parser -> toJSON)
//new Parser each time since it remembers the last speaker
function script_to_json(source: string, info: StoryInfo): StoryJSON {
  return toJSON(new Parser().produceAST(source), info);
}

const simple_story_info: StoryInfo = {
  title: 'Simple Story',
  author: 'loganlgr',
  story_id: 'story-3',
};

const tresspassing_info: StoryInfo = {
  title: 'Tresspassing',
  author: 'lauren',
  story_id: 'story-2',
};

//turns a script into the chapter response the backend would send back
function chapter_response(
  script: string,
  chapter_title: string,
  info: StoryInfo,
): APIResponse<ChapterResponse> {
  return {
    success: true,
    message: 'ok',
    data: {
      _id: 'chapter-1',
      title: chapter_title,
      order: 0,
      contents: script_to_json(script, info),
    },
  };
}

describe('script -> reader (integration)', () => {
  let fixture: ComponentFixture<Reader>;
  let compiled: HTMLElement;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Reader],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(), //catches requests so the test can answer them instead of the backend
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Reader);
    compiled = fixture.nativeElement as HTMLElement;
    http = TestBed.inject(HttpTestingController);

    TestBed.tick(); //renders the page, which starts loading the chapter
    await new Promise((resolve) => setTimeout(resolve)); //lets the chapter request get sent before a test looks for it
  });

  //fails the test if the page made a request that no test answered
  afterEach(() => http.verify());

  //removes extra spaces and newlines the template adds around text
  function clean(text: string | null | undefined) {
    return text?.replace(/\s+/g, ' ').trim() ?? '';
  }

  //what the current page shows, written as one line:
  //title or end page -> the title, prose -> the text, dialogue -> "Speaker: text"
  function page_text() {
    const title = compiled.querySelector('.chapter-title');
    if (title) {
      return clean(title.textContent);
    }
    const speaker = clean(compiled.querySelector('.speaker-name')?.textContent);
    const text = clean(compiled.querySelector('.dialogue-box')?.textContent);
    return speaker ? `${speaker}: ${text}` : text;
  }

  //the options on the current choice page, e.g. "1. Accept it"
  function options() {
    return Array.from(compiled.querySelectorAll('.choice-option')).map((option) =>
      clean(option.textContent),
    );
  }

  //stops reading after this many pages so a story that loops fails clearly instead of timing out
  const max_pages = 100;

  //clicks through the story and returns every page it showed,
  //stops when it reaches a page that can't be clicked past (a choice or the end)
  async function read_until_stopped() {
    const pages: string[] = [];
    let page = compiled.querySelector<HTMLButtonElement>('button.reader-page');
    while (page) {
      if (pages.length >= max_pages) {
        throw new Error(
          `still reading after ${max_pages} pages, the story may be looping. last pages: ${pages.slice(-3).join(' | ')}`,
        );
      }
      pages.push(page_text());
      page.click();
      await fixture.whenStable();
      page = compiled.querySelector<HTMLButtonElement>('button.reader-page');
    }
    return pages;
  }

  //clicks the option with exactly this text (without its number)
  async function choose(option_text: string) {
    const buttons = Array.from(compiled.querySelectorAll<HTMLButtonElement>('.choice-option'));
    const option = buttons.find(
      (button) => clean(button.textContent).replace(/^\d+\.\s*/, '') === option_text,
    );
    if (!option) {
      throw new Error(`no option "${option_text}", the options are: ${options().join(', ')}`);
    }
    option.click();
    await fixture.whenStable();
  }

  //answers the reader's chapter request with the script turned into JSON
  async function load(script: string, chapter_title: string, info: StoryInfo) {
    http.expectOne(MOCK_CHAPTER_URL).flush(chapter_response(script, chapter_title, info));
    await fixture.whenStable();
  }

  //reads up to each choice and picks the given options in order,
  //then returns the pages shown after the last pick
  async function play_path(choices: string[]) {
    for (const choice of choices) {
      await read_until_stopped();
      await choose(choice);
    }
    return read_until_stopped();
  }

  // ---------- Full walkthroughs: every page up to and including each choice ----------

  it('plays simple story through both choices to an ending', async () => {
    await load(simpleStory, 'Chapter 1: The Presentation', simple_story_info);

    expect(await read_until_stopped()).toEqual([
      'Chapter 1: The Presentation',
      'Team Beluga arrives at the classroom on time for their meeting with Lauren.',
      'Arthur: Good morning Lauren, welcome to Interactive fiction!',
      'Paul: We worked very hard on this, Adejare and I got zero sleep!',
      'Adejare looks at you with sleepless eyes.',
      'Krupal: Wake up dude..',
    ]);

    //the choice page repeats the line before it above the options
    expect(page_text()).toBe('Krupal: Wake up dude..');
    expect(options()).toEqual([
      '1. Ignore the group',
      '2. Say goodmorning',
      '3. Immediately give the group an A',
    ]);
    await choose('Say goodmorning');

    expect(await read_until_stopped()).toEqual([
      'Lara: Thank goodness this isn’t a carpooling app am I right?',
      'Carsten: We literally had that same idea Lara… We aren’t any better.',
    ]);

    expect(page_text()).toBe(
      'Carsten: We literally had that same idea Lara… We aren’t any better.',
    );
    expect(options()).toEqual(['1. Give team Beluga an F', '2. Give team Beluga an A']);
    await choose('Give team Beluga an F');

    expect(await read_until_stopped()).toEqual([
      'Lara: Hey! You can’t do that! I have to fight you now.',
      'You get into a physical altercation with Lara..',
      'You win without a scratch.',
    ]);
    expect(page_text()).toBe('The End.');
  });

  it('plays tresspassing through the conversation and a choice to an ending', async () => {
    await load(tresspassing, 'Chapter 1: Tresspassing', tresspassing_info);

    expect(await read_until_stopped()).toEqual([
      'Chapter 1: Tresspassing',
      'Grandpa: You got written permission to fish here?',
      'Fisherman: Huh?',
      'Grandpa: Written permission from Trey Taylor.',
      'Fisherman: Trey Taylor?',
      'Grandpa: Crew Tractor.',
      'Fisherman: Oh, Crew Tractor.',
      'Grandpa: He, who, uh, who told you you could fish here?',
      'Fisherman: Man, I thought it was state property.',
      'Grandpa: State?',
      'Fisherman: Yeah.',
      'Grandpa: This?',
      'Fisherman: Yeah.',
      "Grandpa: State? Hit the road, dude. This ain't no state property. This is priiiivvaate prooopeeerrtyyy.",
    ]);

    expect(page_text()).toBe(
      "Grandpa: State? Hit the road, dude. This ain't no state property. This is priiiivvaate prooopeeerrtyyy.",
    );
    expect(options()).toEqual(['1. Accept it', '2. Ask to finish your last cast']);
    await choose('Ask to finish your last cast');

    expect(await read_until_stopped()).toEqual([
      'Fisherman: Can I at least finish this last cast?',
      'Grandpa: One cast.',
      'You cast and haul a giant catfish onto the grass.',
      "Grandpa: Well I'll be. Come back Saturday, and bring two rods.",
    ]);
    expect(page_text()).toBe('The End.');
  });

  // ---------- Every other path: the options the walkthroughs don't pick ----------
  // each row: the options picked in order, then the pages shown after the last pick before "The End."

  it.each<[string[], string[]]>([
    [
      ['Ignore the group'],
      ['The group looks worried that you are unresponsive and calls medical.'],
    ],
    //"The correct option" only matches "# the correct option" because flags ignore case
    [
      ['Immediately give the group an A'],
      ['Everyone celebrates.', 'Colin wakes up. It was all a dream'],
    ],
    //a second choice that jumps to the same line as the one above
    [
      ['Say goodmorning', 'Give team Beluga an A'],
      ['Everyone celebrates.', 'Colin wakes up. It was all a dream'],
    ],
  ])('simple story: picking %j reaches the right ending', async (choices, pages) => {
    await load(simpleStory, 'Chapter 1: The Presentation', simple_story_info);

    expect(await play_path(choices)).toEqual(pages);
    expect(page_text()).toBe('The End.');
  });

  it.each<[string[], string[]]>([[['Accept it'], ['Fisherman: Oh, okay.']]])(
    'tresspassing: picking %j reaches the right ending',
    async (choices, pages) => {
      await load(tresspassing, 'Chapter 1: Tresspassing', tresspassing_info);

      expect(await play_path(choices)).toEqual(pages);
      expect(page_text()).toBe('The End.');
    },
  );
});
