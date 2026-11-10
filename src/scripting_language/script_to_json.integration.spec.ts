import Parser from './parser.ts';
import { toJSON } from './to_json.ts';
import { simpleStory, tresspassing } from './examples/stories.ts';
import { StoryInfo, StoryJSON } from '../models/story.ts';
import {
  simple_story_expected,
  tresspassing_expected,
} from './examples/script_to_json.expected.ts';

// Integration tests: a whole script goes through every stage (lexer -> parser -> toJSON)
// the unit specs check each feature, these check that real stories come out the other end correctly

//info for toJSON call, values don't matter for these tests
const info: StoryInfo = {
  title: 'Test Story',
  author: 'test-author',
  story_id: 'test-id',
};

//runs a script through the whole pipeline (lexer -> parser -> toJSON)
//new Parser each time since it remembers the last speaker
function script_to_json(source: string, info: StoryInfo): StoryJSON {
  return toJSON(new Parser().produceAST(source), info);
}

// ---------- Example stories ----------
// simpleStory and tresspassing come from examples/stories.ts (the same ones test_parser.ts prints)

//story name, script, and the JSON it should turn into (see script_to_json.expected.ts)
const stories: [string, string, StoryJSON['story']][] = [
  ['simple_story', simpleStory, simple_story_expected],
  ['tresspassing', tresspassing, tresspassing_expected],
];

describe('script -> JSON (integration)', () => {
  it.each(stories)('%s converts to the expected JSON', (_, script, expected) => {
    expect(script_to_json(script, info)).toEqual({ ...info, characters: {}, story: expected });
  });
});
