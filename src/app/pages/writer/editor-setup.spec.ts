import { create_editor } from './editor-setup';
import { set_error_line } from './error-line';

describe('create_editor', () => {
  let parent: HTMLElement;

  beforeEach(() => {
    // the div the editor is put into, attached to the page so it's really rendered
    parent = document.createElement('div');
    document.body.appendChild(parent);
  });

  afterEach(() => {
    parent.remove();
  });

  it('should make an editor showing the text, with the error line extension added', () => {
    const view = create_editor(parent, 'Hello.\nWorld.', vi.fn());

    // the editor is on the page and shows the text it was given
    expect(parent.querySelector('.cm-editor')).not.toBeNull();
    expect(view.state.doc.toString()).toBe('Hello.\nWorld.');

    // the error line extension is in place, so highlighting line 2 colours it
    view.dispatch({ effects: set_error_line.of(2) });
    expect(parent.querySelector('.cm-error-line')).not.toBeNull();

    view.destroy();
  });
});
