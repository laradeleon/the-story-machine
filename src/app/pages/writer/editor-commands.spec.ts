import { EditorView } from '@codemirror/view';
import { choice_snippet, insert_on_own_line } from './editor-commands';

// makes an editor with this text in it, attached to the page so it behaves like the real one
function make_view(doc: string): EditorView {
  const parent = document.createElement('div');
  document.body.appendChild(parent);
  return new EditorView({ doc, parent });
}

describe('choice_snippet', () => {
  it('should write a Choice line followed by one line per option', () => {
    expect(choice_snippet(2)).toBe(
      'Choice:\n[option 1 text] -> [flag name]\n[option 2 text] -> [flag name]',
    );
  });
});

describe('insert_on_own_line', () => {
  it('should add the text without extra line breaks on an empty line', () => {
    const view = make_view('');

    insert_on_own_line(view, '# flag');

    expect(view.state.doc.toString()).toBe('# flag');
    view.destroy();
  });

  it('should add line breaks when there is text before and after the cursor', () => {
    const view = make_view('abc');
    view.dispatch({ selection: { anchor: 1 } }); // a|bc

    insert_on_own_line(view, '# flag');

    expect(view.state.doc.toString()).toBe('a\n# flag\nbc');
    view.destroy();
  });

  it('should replace the selected text', () => {
    const view = make_view('hello world');
    view.dispatch({ selection: { anchor: 0, head: 5 } }); // [hello] world

    insert_on_own_line(view, 'END');

    expect(view.state.doc.toString()).toBe('END\n world');
    view.destroy();
  });

  it('should move the cursor to just after the inserted text', () => {
    const view = make_view('abc');
    view.dispatch({ selection: { anchor: 1 } }); // a|bc

    insert_on_own_line(view, '# flag');

    // "a\n# flag\nbc": the cursor goes after "# flag", which ends at position 8
    expect(view.state.selection.main.head).toBe(8);
    view.destroy();
  });
});
