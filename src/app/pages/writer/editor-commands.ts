// edits the writer's toolbar buttons make to the editor
import { EditorView } from '@codemirror/view';

// the script syntax each toolbar button adds, with placeholders for the writer to replace
export const SNIPPETS = {
  flag: '# [put your flag name here]', // a place in the story to jump to
  goto: '-> [flag name]', // jumps to a flag
  end: 'END', // the story finishes here
};

// a choice with this many options, each pointing at a flag
export function choice_snippet(count: number): string {
  const options = Array.from({ length: count }, (_, i) => `[option ${i + 1} text] -> [flag name]`);
  return ['Choice:', ...options].join('\n');
}

// puts text where the cursor is (replacing any selected text) and moves the cursor to the end of it.
// flags and choices have to be on their own lines, so line breaks are added if there's text
// before or after the cursor on the same line
export function insert_on_own_line(view: EditorView, text: string) {
  const { from, to } = view.state.selection.main; // the cursor, or the selected text if there is some
  const startLine = view.state.doc.lineAt(from);
  const endLine = view.state.doc.lineAt(to);

  const textBefore = startLine.text.slice(0, from - startLine.from);
  const textAfter = endLine.text.slice(to - endLine.from);
  const before = textBefore.trim() !== '' ? '\n' : '';
  const after = textAfter.trim() !== '' ? '\n' : '';

  view.dispatch({
    changes: { from, to, insert: `${before}${text}${after}` },
    selection: { anchor: from + before.length + text.length }, // just after the inserted text
    scrollIntoView: true,
  });
  view.focus(); // clicking the button took focus away from the editor, give it back
}
