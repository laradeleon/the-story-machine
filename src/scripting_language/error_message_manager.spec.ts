import { ErrorKind, ErrorMessageManager, ScriptError } from './error_message_manager.ts';

describe('ErrorMessageManager', () => {
  const errors = new ErrorMessageManager();

  describe('format_error', () => {
    it('builds a ScriptError with the kind and line it was given', () => {
      const error = errors.format_error(ErrorKind.MissingFlagName, 4);

      expect(error).toBeInstanceOf(ScriptError);
      expect(error.kind).toBe(ErrorKind.MissingFlagName);
      expect(error.line).toBe(4);
    });

    it('puts the line number in the message', () => {
      const error = errors.format_error(ErrorKind.MissingFlagName, 4);

      expect(error.message).toContain('Line 4');
    });

    it('fills in the extra details the template asks for', () => {
      const error = errors.format_error(ErrorKind.UnexpectedToken, 2, 'Grandpa');

      expect(error.message).toContain("'Grandpa'");
    });

    it('gives every kind a message that includes the line number', () => {
      for (const kind of Object.values(ErrorKind)) {
        // extra details are passed as blanks so every template has something to fill in
        const error = errors.format_error(kind, 7, '', '', '');

        expect(error.message, kind).toContain('Line 7');
      }
    });
  });

  describe('line_of', () => {
    it('returns the line of a ScriptError', () => {
      const error = errors.format_error(ErrorKind.FlagDoesNotExist, 9);

      expect(errors.line_of(error)).toBe(9);
    });

    it('returns null for a plain Error', () => {
      expect(errors.line_of(new Error('Line 3 went wrong'))).toBeNull();
    });

    it('returns null for anything that is not an error', () => {
      expect(errors.line_of('Line 3')).toBeNull();
      expect(errors.line_of(undefined)).toBeNull();
    });
  });
});
