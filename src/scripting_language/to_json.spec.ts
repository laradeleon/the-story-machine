import { toJSON } from './to_json.ts';
import { ASTNode, StoryNode } from './ast.ts';
import { StoryInfo } from '../models/story.ts';

//info for toJSON call, values don't matter for these tests
const info: StoryInfo = {
  title: 'Test Story',
  author: 'test-author',
  story_id: 'test-id',
};

//wraps a list of nodes in a StoryNode so each test only has to write the body
function story(body: ASTNode[]): StoryNode {
  //lineNumber 0 because the story node isn't a real line in the script
  return { kind: 'StoryNode', lineNumber: 0, body: body };
}

describe('toJSON', () => {
  // Each test follows: arrange (build the AST) -> act (call toJSON) -> assert (expect)

  // ---------- Basic lines ----------

  it('converts a ProseNode into a prose line', () => {
    const input = story([{ kind: 'ProseNode', lineNumber: 1, text: 'Earth to Logan.' }]);

    const result = toJSON(input, info);

    expect(result.story.lines).toEqual([
      {
        line_id: 0,
        prose: { text: { words: ['Earth', 'to', 'Logan.'] }, text_color: null },
      },
    ]);
  });

  it('converts a DialogueNode into a dialogue line', () => {
    const input = story([
      { kind: 'DialogueNode', lineNumber: 1, speaker: 'Logan', text: '"Good morning!"' },
    ]);

    const result = toJSON(input, info);

    expect(result.story.lines).toEqual([
      {
        line_id: 0,
        dialogue: {
          name: 'Logan',
          portrait: 'default',
          text: { words: ['Good', 'morning!'] }, //the outer quotes get removed
          text_color: null,
        },
      },
    ]);
  });

  it('converts an EndNode into an end line', () => {
    const input = story([{ kind: 'EndNode', lineNumber: 1 }]);

    const result = toJSON(input, info);

    expect(result.story.lines).toEqual([{ line_id: 0, end: true }]);
  });

  it('increasing line_id', () => {
    const input = story([
      { kind: 'ProseNode', lineNumber: 1, text: 'One.' },
      { kind: 'DialogueNode', lineNumber: 2, speaker: 'Grandpa', text: '"Two."' },
      { kind: 'EndNode', lineNumber: 3 },
    ]);

    const result = toJSON(input, info);

    expect(result.story.lines.map((line) => line.line_id)).toEqual([0, 1, 2]);
  });

  it('copies the story info onto the result', () => {
    const input = story([{ kind: 'EndNode', lineNumber: 1 }]);

    const result = toJSON(input, info);

    expect(result.title).toBe('Test Story');
    expect(result.author).toBe('test-author');
    expect(result.story_id).toBe('test-id');
  });

  // ---------- Text ----------

  it('ignores extra whitespace between words', () => {
    const input = story([{ kind: 'ProseNode', lineNumber: 1, text: '  Hello    there  ' }]);

    const result = toJSON(input, info);

    expect(result.story.lines[0]).toEqual({
      line_id: 0,
      prose: { text: { words: ['Hello', 'there'] }, text_color: null },
    });
  });

  it('removes curly quotes from the edges of text', () => {
    const input = story([
      { kind: 'DialogueNode', lineNumber: 1, speaker: 'Krupal', text: '“Wake up dude..”' },
    ]);

    const result = toJSON(input, info);

    expect(result.story.lines[0]).toEqual({
      line_id: 0,
      dialogue: {
        name: 'Krupal',
        portrait: 'default',
        text: { words: ['Wake', 'up', 'dude..'] },
        text_color: null,
      },
    });
  });

  // ---------- Flags, choices and gotos ----------

  it('points a flag at the line right after it', () => {
    const input = story([
      { kind: 'ProseNode', lineNumber: 1, text: 'Before.' },
      { kind: 'FlagNode', lineNumber: 2, name: 'ending' },
      { kind: 'ProseNode', lineNumber: 3, text: 'After.' },
    ]);

    const result = toJSON(input, info);

    //the flag doesn't create a line, so "After." is line 1
    expect(result.story.flags).toEqual({ ending: { line_id: 1 } });
    expect(result.story.lines.length).toBe(2);
  });

  it('resolves choice destinations to line ids', () => {
    const input = story([
      {
        kind: 'ChoiceNode',
        lineNumber: 1,
        options: [
          { kind: 'ChoiceOptionNode', lineNumber: 2, text: 'Go left', destination: 'left' },
          { kind: 'ChoiceOptionNode', lineNumber: 3, text: 'Go right', destination: 'right' },
        ],
      },
      { kind: 'FlagNode', lineNumber: 4, name: 'left' },
      { kind: 'ProseNode', lineNumber: 5, text: 'You went left.' },
      { kind: 'FlagNode', lineNumber: 6, name: 'right' },
      { kind: 'EndNode', lineNumber: 7 },
    ]);

    const result = toJSON(input, info);

    //lines: 0 = choice, 1 = "You went left.", 2 = END
    expect(result.story.lines[0]).toEqual({
      line_id: 0,
      choice: [
        { goto_line: 1, option_body: 'Go left', condition: null },
        { goto_line: 2, option_body: 'Go right', condition: null },
      ],
    });
  });

  it('resolves a goto destination to a line id', () => {
    const input = story([
      { kind: 'GotoNode', lineNumber: 1, destination: 'ending' },
      { kind: 'ProseNode', lineNumber: 2, text: 'Skipped.' },
      { kind: 'FlagNode', lineNumber: 3, name: 'ending' },
      { kind: 'EndNode', lineNumber: 4 },
    ]);

    const result = toJSON(input, info);

    expect(result.story.lines[0]).toEqual({ line_id: 0, goto_line: 2 });
  });

  it('matches flag names regardless of case', () => {
    const input = story([
      { kind: 'GotoNode', lineNumber: 1, destination: 'ENDING' },
      { kind: 'FlagNode', lineNumber: 2, name: 'Ending' },
      { kind: 'EndNode', lineNumber: 3 },
    ]);

    const result = toJSON(input, info);

    expect(result.story.lines[0]).toEqual({ line_id: 0, goto_line: 1 });
    //flag names are stored lowercased
    expect(result.story.flags).toEqual({ ending: { line_id: 1 } });
  });

  // ---------- Errors ----------

  it('throws on duplicate flag names', () => {
    const input = story([
      { kind: 'FlagNode', lineNumber: 1, name: 'ending' },
      { kind: 'EndNode', lineNumber: 2 },
      { kind: 'FlagNode', lineNumber: 3, name: 'Ending' },
      { kind: 'EndNode', lineNumber: 4 },
    ]);

    //the arrow function matters, without it the error is thrown before expect can catch it
    expect(() => toJSON(input, info)).toThrow('Flag already exists on line: 3');
  });

  it('throws when a goto points at a missing flag', () => {
    const input = story([{ kind: 'GotoNode', lineNumber: 1, destination: 'nowhere' }]);

    expect(() => toJSON(input, info)).toThrow('Flag does not exist for goto on line: 1');
  });

  it('throws when a choice option points at a missing flag', () => {
    const input = story([
      {
        kind: 'ChoiceNode',
        lineNumber: 1,
        options: [
          { kind: 'ChoiceOptionNode', lineNumber: 2, text: 'Go nowhere', destination: 'nowhere' },
        ],
      },
    ]);

    //the error uses the option's line number, not the choice's
    expect(() => toJSON(input, info)).toThrow('Flag does not exist for goto on line: 2');
  });
});
