// builds the CodeMirror editor the writer page types into
import { basicSetup } from 'codemirror';
import { EditorView } from '@codemirror/view';
import { error_line_extension } from './error-line';

// makes a new editor inside parent, starting with doc as its text.
// on_error_line_cleared is passed on to the error highlight, see error_line_extension()
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
      // colouring the line a preview error is on, and hiding its message once it's edited
      error_line_extension(on_error_line_cleared),
    ],
  });
}
