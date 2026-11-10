// builds the CodeMirror editor the writer page types into
import { basicSetup } from 'codemirror';
import { EditorView } from '@codemirror/view';
import { error_line_highlight, has_error_line } from './error-line';

// makes a new editor inside parent, starting with doc as its text.
// on_error_line_cleared is called when an edit removes the error highlight
// (the writer changed the line with the mistake), so the page can hide the error message too
export function create_editor(
  parent: HTMLElement,
  doc: string,
  on_error_line_cleared: () => void,
): EditorView {
  return new EditorView({
    doc,
    parent,
    extensions: [
      // some basic extensions for the codemirror (line numbers, undo, brackets...)
      basicSetup,
      // colouring the line a preview error is on
      error_line_highlight,
      EditorView.updateListener.of((update) => {
        // hide the error message once its line has been edited, since it's out of date.
        // (edits to other lines keep it, unless the error didn't say which line it was on)
        if (update.docChanged && !has_error_line(update.state)) {
          on_error_line_cleared();
        }
      }),
    ],
  });
}
