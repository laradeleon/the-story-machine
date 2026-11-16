import { EditorView, lineNumbers } from '@codemirror/view';
import { ErrorKind, ErrorMessageManager } from '../../../scripting_language/error_message_manager';
import { error_line_extension, line_from_error, set_error_line } from './error-line';

describe('error-line', () => {
  let parent: HTMLElement;

  // the text of the line currently coloured as the error, or null when none is coloured
  function highlighted_text(): string | null {
    return parent.querySelector('.cm-error-line')?.textContent ?? null;
  }

  // makes an editor with only the error line extension (plus line numbers for the gutter)
  function make_view(doc: string, on_cleared: () => void = vi.fn()): EditorView {
    return new EditorView({
      doc,
      parent,
      extensions: [lineNumbers(), error_line_extension(on_cleared)],
    });
  }

  beforeEach(() => {
    parent = document.createElement('div');
    document.body.appendChild(parent);
  });

  afterEach(() => {
    parent.remove();
  });

  describe('line_from_error', () => {
    it('returns the line of a parser error', () => {
      const error = new ErrorMessageManager().format_error(ErrorKind.MissingFlagName, 12);

      expect(line_from_error(error)).toBe(12);
    });

    it('returns null for an error that is not a parser error', () => {
      expect(line_from_error(new Error('Line 12 went wrong'))).toBeNull();
    });

    it('returns null for something that is not an error at all', () => {
      expect(line_from_error('Line 12')).toBeNull();
    });
  });

  describe('highlighting', () => {
    it('colours the line it is given, both in the text and the gutter', () => {
      const view = make_view('Hello.\nWorld.');

      view.dispatch({ effects: set_error_line.of(2) });

      expect(highlighted_text()).toBe('World.');
      expect(parent.querySelector('.cm-error-gutter')).not.toBeNull();
      view.destroy();
    });

    it('clears the colouring when given null', () => {
      const view = make_view('Hello.\nWorld.');
      view.dispatch({ effects: set_error_line.of(2) });

      view.dispatch({ effects: set_error_line.of(null) });

      expect(highlighted_text()).toBeNull();
      expect(parent.querySelector('.cm-error-gutter')).toBeNull();
      view.destroy();
    });

    it('colours the last line when the error points past the end of the document', () => {
      const view = make_view('Hello.\nWorld.');

      view.dispatch({ effects: set_error_line.of(50) });

      expect(highlighted_text()).toBe('World.');
      view.destroy();
    });
  });

  describe('when the writer edits the document', () => {
    it('removes the highlight and calls on_cleared when the error line is edited', () => {
      const on_cleared = vi.fn();
      const view = make_view('Hello.\nWorld.', on_cleared);
      view.dispatch({ effects: set_error_line.of(2) });

      // insert a letter into "World." (which starts at position 7)
      view.dispatch({ changes: { from: 8, insert: 'x' } });

      expect(highlighted_text()).toBeNull();
      expect(on_cleared).toHaveBeenCalledTimes(1);
      view.destroy();
    });

    it('keeps the highlight on the same text when a line above it is edited', () => {
      const on_cleared = vi.fn();
      const view = make_view('Hello.\nWorld.', on_cleared);
      view.dispatch({ effects: set_error_line.of(2) });

      // add a new line above, which pushes "World." down
      view.dispatch({ changes: { from: 0, insert: 'New line\n' } });

      expect(highlighted_text()).toBe('World.');
      expect(on_cleared).not.toHaveBeenCalled();
      view.destroy();
    });

    it('does not call on_cleared when there is no highlight to clear', () => {
      const on_cleared = vi.fn();
      const view = make_view('Hello.\nWorld.', on_cleared);

      view.dispatch({ changes: { from: 0, insert: 'x' } });

      expect(on_cleared).not.toHaveBeenCalled();
      view.destroy();
    });
  });
});
