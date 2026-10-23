// a CodeMirror extension that colours the line the parser found a mistake on,
// both the line itself and its number in the gutter
import { EditorState, RangeSet, StateEffect, StateField, Text } from '@codemirror/state';
import { Decoration, EditorView, GutterMarker, gutterLineClass } from '@codemirror/view';

// sent to the editor with dispatch() to say which line has the error, or null to clear it
export const set_error_line = StateEffect.define<number | null>();

// pulls the line number out of a parser error, e.g. "Missing name for flag at line 12"
// or "Flag does not exist for goto on line: 7", null if the message doesn't have one.
// convention: the LAST "line N" in an error message is the line number, so the writer's own
// text quoted earlier in the message (e.g. "Unexpected token 'wait in line 2' at line 40")
// can't be mistaken for it
export function line_from_error(message: string): number | null {
  const matches = [...message.matchAll(/\bline:?\s*(\d+)/gi)];
  const last = matches.at(-1);
  return last ? Number(last[1]) : null;
}

// the css classes that get added, styled in writer.css
const error_line = Decoration.line({ class: 'cm-error-line' });

class ErrorGutterMarker extends GutterMarker {
  override elementClass = 'cm-error-gutter';
}
const error_gutter = new ErrorGutterMarker();

// where the error line starts in the document (null when there's no error)
// line numbers are given in, but the position is stored so the highlight follows the line
// when the writer types above it and the line moves down
const error_line_field = StateField.define<number | null>({
  create: () => null,

  update(position, transaction) {
    const doc = transaction.state.doc;

    if (position !== null && transaction.docChanged) {
      const errorLine = transaction.startState.doc.lineAt(position);
      if (transaction.changes.touchesRange(errorLine.from, errorLine.to)) {
        // the writer edited (or deleted) the line with the mistake, so the error is out of date
        position = null;
      } else {
        // an edit somewhere else, move the highlight along with its line
        position = doc.lineAt(transaction.changes.mapPos(position)).from;
      }
    }

    // a new error line from preview(), or null to clear it
    for (const effect of transaction.effects) {
      if (effect.is(set_error_line)) {
        position = effect.value === null ? null : line_start(doc, effect.value);
      }
    }
    return position;
  },

  // turn the stored position into the actual colouring in the editor and the gutter
  provide: (field) => [
    EditorView.decorations.from(field, (position) =>
      position === null ? Decoration.none : Decoration.set(error_line.range(position)),
    ),
    gutterLineClass.from(field, (position) =>
      position === null ? RangeSet.empty : RangeSet.of(error_gutter.range(position)),
    ),
  ],
});

// the position where a line starts, kept inside the document in case the error
// points past the last line (e.g. an unexpected end of file)
function line_start(doc: Text, line_number: number): number {
  const line = Math.min(Math.max(line_number, 1), doc.lines);
  return doc.line(line).from;
}

// add this to the editor's extensions to turn the error highlight on
export const error_line_highlight = error_line_field;

// whether a line is still highlighted. it gets cleared when the writer edits that line,
// so the writer page uses this to know when to hide the error message too
export function has_error_line(state: EditorState): boolean {
  return state.field(error_line_field, false) != null;
}
