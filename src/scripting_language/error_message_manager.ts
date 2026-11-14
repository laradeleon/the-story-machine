// Centralized class to track all error messages
// error-line.ts uses this class to track error line numbers

export enum ErrorKind {
  // lexer.ts
  MissingChoiceText = 'missing_choice_text',
  MissingChoiceDestination = 'missing_choice_destination',
  MissingFlagName = 'missing_flag_name',
  MissingGotoDestination = 'missing_goto_destination',
  MissingOpenQuotation = 'missing_open_quotation',
  UnterminatedDialogue = 'unterminated_dialogue',

  // parser.ts
  UnexpectedToken = 'unexpected_token',
  DialogueMissingSpeaker = 'dialogue_missing_speaker',
  ChoiceOptionMissingDestination = 'choice_option_missing_destination',
  TooManyChoiceOptions = 'too_many_choice_options',

  // to_json.ts
  FlagAlreadyExists = 'flag_already_exists',
  FlagDoesNotExist = 'flag_does_not_exist',
}

const message_templates: Record<ErrorKind, (line: number, ...details: string[]) => string> = {
  // lexer.ts
  [ErrorKind.MissingChoiceText]: (line) =>
    `Line ${line} is missing choice text. Choice syntax: choice text -> destination flag`,
  [ErrorKind.MissingChoiceDestination]: (line) =>
    `Line ${line} has a choice missing a destination. Choice syntax: choice text -> destination flag`,
  [ErrorKind.MissingFlagName]: (line) =>
    `Line ${line} has a flag with no name. flag syntax: # flag name`,
  [ErrorKind.MissingGotoDestination]: (line) =>
    `Line ${line} has a goto without a destination. Goto syntax: -> destination name`,
  [ErrorKind.MissingOpenQuotation]: (line) =>
    `Line ${line} is missing quotation marks. Dialogue syntax: Character name: "dialogue"`,
  [ErrorKind.UnterminatedDialogue]: (line, ...reservedStatements: string[]) =>
    `Line ${line} has dialogue that is missing a closing quotation mark. Also make sure no dialogue line begins with reserved statements: '${reservedStatements.join(', ')}'`,

  // parser.ts
  [ErrorKind.UnexpectedToken]: (line, token) => `Line ${line} has an unexpected token: '${token}'`,
  [ErrorKind.DialogueMissingSpeaker]: (line) =>
    `Line ${line} has a dialogue but no speaker. Dialogue syntax: Character name: "dialogue"`,
  [ErrorKind.ChoiceOptionMissingDestination]: (line, token, option) =>
    `Line ${line} has an unexpected token: '${token}'\nNo destination provided for choice option: '${option}'`,
  [ErrorKind.TooManyChoiceOptions]: (line, token, option, max) =>
    `Line ${line} has an unexpected token: '${token}'\nToo many options, maximum of '${max}' options per choice: '${option}'`,

  // to_json.ts
  [ErrorKind.FlagAlreadyExists]: (line) => `Line ${line} has a Flag that already exists`,
  [ErrorKind.FlagDoesNotExist]: (line) => `Line ${line} has a goto with a flag that does not exist`,
};

// the error the lexer, parser and to_json throw instead of a plain Error.
// the message comes from message_templates, and line is stored as an integer so
// error-line.ts can read it without parsing the text
export class ScriptError extends Error {
  readonly kind: ErrorKind;
  readonly line: number;

  constructor(kind: ErrorKind, line: number, ...details: string[]) {
    super(message_templates[kind](line, ...details));
    this.name = 'ScriptError';
    this.kind = kind;
    this.line = line;
    // keeps instanceof ScriptError working when the code is compiled to older targets
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// the one place the lexer, parser and to_json get their errors from, and where
// error-line.ts reads the line number back out of them
export class ErrorMessageManager {
  // builds the error for a kind, the message text comes from message_templates
  format_error(kind: ErrorKind, line: number, ...details: string[]): ScriptError {
    return new ScriptError(kind, line, ...details);
  }

  // the line number of a ScriptError, or null for any other error (e.g. a plain Error)
  line_of(error: unknown): number | null {
    return error instanceof ScriptError ? error.line : null;
  }
}
