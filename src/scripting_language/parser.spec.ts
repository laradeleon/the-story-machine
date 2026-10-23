import Parser, { MAX_OPTIONS } from './parser.ts';

//new Parser each time, it remembers the last speaker between produceAST calls
function parse(source: string) {
  return new Parser().produceAST(source);
}

describe('Parser', () => {
  // ---------- Story ----------

  it('wraps everything in a StoryNode', () => {
    const story = parse('The sun rises.');

    expect(story.kind).toBe('StoryNode');
    expect(story.lineNumber).toBe(0);
    expect(story.body.length).toBe(1);
  });

  it('gives an empty body to an empty script', () => {
    expect(parse('').body).toEqual([]);
  });

  it('keeps nodes in the same order as the script', () => {
    const story = parse('# start\nThe sun rises.\nGrandpa: "Hello."\nEND');

    expect(story.body.map((node) => node.kind)).toEqual([
      'FlagNode',
      'ProseNode',
      'DialogueNode',
      'EndNode',
    ]);
  });

  // ---------- Single nodes ----------

  it('turns prose into a ProseNode', () => {
    expect(parse('The sun rises.').body).toEqual([
      { kind: 'ProseNode', lineNumber: 1, text: 'The sun rises.' },
    ]);
  });

  it('turns dialogue into a DialogueNode', () => {
    expect(parse('Grandpa: "Hello."').body).toEqual([
      { kind: 'DialogueNode', lineNumber: 1, speaker: 'Grandpa', text: '"Hello."' },
    ]);
  });

  it('turns a flag into a FlagNode', () => {
    expect(parse('# ending').body).toEqual([{ kind: 'FlagNode', lineNumber: 1, name: 'ending' }]);
  });

  it('turns a goto into a GotoNode', () => {
    expect(parse('-> ending').body).toEqual([
      { kind: 'GotoNode', lineNumber: 1, destination: 'ending' },
    ]);
  });

  it('turns END into an EndNode', () => {
    expect(parse('END').body).toEqual([{ kind: 'EndNode', lineNumber: 1 }]);
  });

  // ---------- Dialogue speakers ----------

  it('gives each line of dialogue its own speaker', () => {
    const story = parse('Grandpa: "Hello."\nFisherman: "Huh?"');

    expect(story.body).toMatchObject([
      { kind: 'DialogueNode', speaker: 'Grandpa', text: '"Hello."' },
      { kind: 'DialogueNode', speaker: 'Fisherman', text: '"Huh?"' },
    ]);
  });

  it('gives speakerless dialogue to whoever spoke last', () => {
    const story = parse('Grandpa: "Hello."\n"Get off my lawn."');

    expect(story.body[1]).toMatchObject({
      kind: 'DialogueNode',
      speaker: 'Grandpa',
      text: '"Get off my lawn."',
    });
  });

  it('switches the last speaker when a new one is named', () => {
    const story = parse('Grandpa: "Hello."\nFisherman: "Huh?"\n"What?"');

    expect(story.body[2]).toMatchObject({ speaker: 'Fisherman', text: '"What?"' });
  });

  // ---------- Choices ----------

  it('turns a choice into a ChoiceNode with its options', () => {
    const story = parse('Choice:\nGo left -> left\nGo right -> right');

    expect(story.body).toEqual([
      {
        kind: 'ChoiceNode',
        lineNumber: 1,
        options: [
          { kind: 'ChoiceOptionNode', lineNumber: 2, text: 'Go left', destination: 'left' },
          { kind: 'ChoiceOptionNode', lineNumber: 3, text: 'Go right', destination: 'right' },
        ],
      },
    ]);
  });

  it('parsing continues after a choice', () => {
    const story = parse('Choice:\nGo -> left\n# left\nEND');

    expect(story.body.map((node) => node.kind)).toEqual(['ChoiceNode', 'FlagNode', 'EndNode']);
  });

  it(`allows up to ${MAX_OPTIONS} options`, () => {
    const options = Array.from({ length: MAX_OPTIONS }, (_, i) => `Option ${i + 1} -> f${i + 1}`);

    const story = parse('Choice:\n' + options.join('\n'));

    expect(story.body[0]).toMatchObject({ kind: 'ChoiceNode' });
    expect((story.body[0] as { options: unknown[] }).options.length).toBe(MAX_OPTIONS);
  });

  // ---------- Errors ----------

  it('throws an error when dialogue has no speaker and no one has spoken yet', () => {
    expect(() => parse('"Hello."')).toThrow('Dialogue text has no speaker at line 1');
  });

  it('throws an error when the first speaker is only named after speakerless dialogue', () => {
    //the speaker has to come before, not after
    expect(() => parse('"Hello."\nGrandpa: "Hi."')).toThrow(
      'Dialogue text has no speaker at line 1',
    );
  });

  it(`throws an error when a choice has more than ${MAX_OPTIONS} options`, () => {
    const options = Array.from(
      { length: MAX_OPTIONS + 1 },
      (_, i) => `Option ${i + 1} -> f${i + 1}`,
    );

    expect(() => parse('Choice:\n' + options.join('\n'))).toThrow(
      `Too many options, maximum of '${MAX_OPTIONS}' options per choice: 'Option ${MAX_OPTIONS + 1}'`,
    );
  });
});
