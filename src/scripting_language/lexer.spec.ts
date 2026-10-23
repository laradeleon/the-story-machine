import { tokenize, Token, TokenType } from './lexer.ts';

//shorthand for writing the tokens we expect
function tok(lineNumber: number, value: string, type: TokenType): Token {
  return { lineNumber, value, type };
}

describe('tokenize', () => {
  it('turns a plain line into a prose token', () => {
    const tokens = tokenize('The sun rises.');

    expect(tokens).toEqual([
      tok(1, 'The sun rises.', TokenType.Prose),
      tok(2, 'EndOfFile', TokenType.EOF),
    ]);
  });

  it('always ends with an EOF token', () => {
    const tokens = tokenize('');

    expect(tokens).toEqual([tok(2, 'EndOfFile', TokenType.EOF)]);
  });

  it('splits dialogue into a speaker token and a text token', () => {
    const tokens = tokenize('Grandpa: "Hello."');

    expect(tokens).toEqual([
      tok(1, 'Grandpa', TokenType.DialogueSpeaker),
      tok(1, '"Hello."', TokenType.DialogueText), //quotes are kept, to_json removes them
      tok(2, 'EndOfFile', TokenType.EOF),
    ]);
  });

  it('accepts quotes in dialogue', () => {
    const tokens = tokenize('Krupal: “Wake up dude..”');

    expect(tokens[1]).toEqual(tok(1, '“Wake up dude..”', TokenType.DialogueText));
  });

  it('turns END into an end token, ignoring case', () => {
    const tokens = tokenize('END\nend');

    expect(tokens).toEqual([
      tok(1, 'END', TokenType.End),
      tok(2, 'end', TokenType.End),
      tok(3, 'EndOfFile', TokenType.EOF),
    ]);
  });

  // ---------- Flags and gotos ----------

  it('removes the # from a flag', () => {
    const tokens = tokenize('#   ending  ');

    expect(tokens[0]).toEqual(tok(1, 'ending', TokenType.Flag));
  });

  it('removes the arrow from a goto', () => {
    const tokens = tokenize('-> place');

    expect(tokens[0]).toEqual(tok(1, 'place', TokenType.Goto));
  });

  // ---------- Choices ----------

  it('turns a choice block into a start token with options on each line', () => {
    const tokens = tokenize('Choice:\n Go left -> left \n Go right -> right');

    expect(tokens).toEqual([
      tok(1, 'Choice:', TokenType.ChoiceStart),
      tok(2, 'Go left', TokenType.ChoiceOption),
      tok(2, 'left', TokenType.Goto),
      tok(3, 'Go right', TokenType.ChoiceOption),
      tok(3, 'right', TokenType.Goto),
      tok(4, 'EndOfFile', TokenType.EOF),
    ]);
  });

  it('recognises Choice: regardless of case', () => {
    const tokens = tokenize('CHOICE:\n Go -> left');

    expect(tokens[0]).toEqual(tok(1, 'CHOICE:', TokenType.ChoiceStart));
  });

  it('stops reading options at the first line without an arrow', () => {
    const tokens = tokenize('Choice: \n Go -> left \n The sun rises.');

    expect(tokens.map((token) => token.type)).toEqual([
      TokenType.ChoiceStart,
      TokenType.ChoiceOption,
      TokenType.Goto,
      TokenType.Prose,
      TokenType.EOF,
    ]);
  });

  // ---------- Line numbers ----------

  it('counts and skips blank lines', () => {
    const tokens = tokenize('One.\n\n   \nTwo.');

    expect(tokens).toEqual([
      tok(1, 'One.', TokenType.Prose),
      tok(4, 'Two.', TokenType.Prose),
      tok(5, 'EndOfFile', TokenType.EOF),
    ]);
  });

  it('consistent line numbers after a choice block', () => {
    const tokens = tokenize('Choice:\nGo -> left\n# left');

    expect(tokens[3]).toEqual(tok(3, 'left', TokenType.Flag));
  });

  // ---------- Dialogue across lines ----------

  it('joins dialogue that continues onto the next line', () => {
    const tokens = tokenize('Grandpa: "Hello\nthere."');

    expect(tokens).toEqual([
      tok(1, 'Grandpa', TokenType.DialogueSpeaker),
      tok(1, '"Hello there."', TokenType.DialogueText),
      tok(3, 'EndOfFile', TokenType.EOF),
    ]);
  });

  // ---------- Dialogue without a speaker ----------
  // the lexer just makes a DialogueText token, the parser gives it to the last speaker

  it('turns a quoted line with no speaker into a dialogue text token', () => {
    const tokens = tokenize('"Hello."');

    expect(tokens[0]).toEqual(tok(1, '"Hello."', TokenType.DialogueText));
  });

  it('joins speakerless dialogue that continues onto the next line', () => {
    const tokens = tokenize('"Hello\nthere."');

    expect(tokens[0]).toEqual(tok(1, '"Hello there."', TokenType.DialogueText));
  });

  // ---------- Errors ----------

  it('throws an error when a flag has no name', () => {
    expect(() => tokenize('#')).toThrow('Missing name for flag at line 1');
  });

  it('throws an error when a goto has no destination', () => {
    expect(() => tokenize('->')).toThrow('Missing destination for goto at line 1');
  });

  it('throws an error when a choice option has no text', () => {
    expect(() => tokenize('Choice:\n-> left')).toThrow('Missing choice text choice at line 2');
  });

  it('throws an error when a choice option has no destination', () => {
    expect(() => tokenize('Choice:\nGo left ->')).toThrow(
      'Missing destination for choice at line 2',
    );
  });

  it('throws an error when dialogue is missing its opening quote', () => {
    expect(() => tokenize('Grandpa: Hello."')).toThrow('Missing open quotations at line 1');
  });
});
