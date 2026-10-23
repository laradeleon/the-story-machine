import { afterNextRender, Component, DestroyRef, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PreviewService } from '../../services/preview.service';
import { MetadataDialog } from '../../components/metadata-dialog/metadata-dialog';
import { ComingSoonDialog } from '../../components/coming-soon-dialog/coming-soon-dialog';
import Parser, { MAX_OPTIONS } from '../../../scripting_language/parser';
import { toJSON } from '../../../scripting_language/to_json';
import {
  error_line_highlight,
  has_error_line,
  line_from_error,
  set_error_line,
} from './error-line';
import { basicSetup } from 'codemirror';
import { EditorView } from '@codemirror/view';

const exampleStory = `Welcome to The Story Machine.

This is a platform for writing, reading and sharing interactive fiction. 

You can just have text show up by just writing it on its own like so

Hello, world.

Dialogue is shown with quotes and by specifying the character before 

For example
Arthur: “Good morning Lauren, welcome to Interactive fiction!”
Paul: "We worked very hard on this, Adejare and I got zero sleep!”
Adejare looks at you with sleepless eyes.
Krupal: “Wake up dude..”

You can define flags, these are points in the story we can jump to 

# [a flag]

You can users make a choice like so

Choice:
[what goes in the text box] -> [a flag]
move on -> continue 

# continue

Finally, to end the story, we use the END keyword.

END

For now we only support a few keywords, but down the line, we intend to have far more functionality.
Sprint 1 was about getting the foundation planted.

`;

//setup for writer component
@Component({
  imports: [RouterLink, MetadataDialog, ComingSoonDialog],
  selector: 'app-writer',
  styleUrl: './writer.css',
  templateUrl: './writer.html',
  host: {
    //the browser is refreshing or closing the page, which skips onDestroy, so save here too
    '(window:pagehide)': 'save_script()',
  },
})
export class Writer {
  //init an editorview
  editorView?: EditorView;

  protected previewService = inject(PreviewService); //protected so the template can use the metadata in it
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  //whether the metadata popup is showing
  protected metadataOpen = signal(false);

  //TEMPORARY: the name of the unfinished button that was clicked, shown in the coming soon popup.
  //null when the popup is closed
  protected comingSoon = signal<string | null>(null);

  //the numbered buttons next to "Choice", each adds a choice with that many options
  protected choiceCounts = Array.from({ length: MAX_OPTIONS }, (_, i) => i + 1); //[1, 2, 3, 4], the parser's limit

  //the parser's error message when the script has a mistake in it, null when there isn't one
  protected previewError = signal<string | null>(null);

  constructor() {
    //start render prep for the codemirror
    afterNextRender(() => {
      //get the div where the codemirror will live
      const targetElement = document.getElementById('mainwriting');

      //if the div exists, make a new CodeMirror EditorView
      if (targetElement) {
        this.editorView = new EditorView({
          //the default text in the editor, replace with chapter text when editing a chapter
          //coming back to the writer puts the script back how it was left, otherwise start with the example
          doc: this.previewService.script() ?? exampleStory,
          extensions: [
            //some basic extensions for the codemirror
            basicSetup,
            //colouring the line a preview error is on
            error_line_highlight,
            EditorView.updateListener.of((update) => {
              if (update.docChanged) {
                //hide the error message once its line has been edited, since it's out of date.
                //(edits to other lines keep it, unless the error didn't say which line it was on)
                if (!has_error_line(update.state)) {
                  this.previewError.set(null);
                }
              }
            }),
          ],
          //the target in the .html
          parent: targetElement,
        });
      }
    });

    //runs when the writer page closes, however the writer leaves (Back, Preview, browser back...)
    this.destroyRef.onDestroy(() => {
      //keep the latest script (has to happen before destroy, the text can't be read after that)
      this.save_script();
      //remove CodeMirror's listeners and free its copy of the document,
      //otherwise every visit to the writer leaves an old editor behind
      this.editorView?.destroy();
    });
  }

  //saves the editor's text to the preview service and localStorage.
  //only done when leaving the page, refreshing/closing it or pressing Preview, not on every
  //keystroke, so typing doesn't slow down as the story gets longer
  protected save_script() {
    if (this.editorView) {
      this.previewService.save_script_now(this.editorView.state.doc.toString());
    }
  }

  //adds a flag where the cursor is in the editor, with a placeholder for the writer to replace
  protected insert_flag() {
    this.insert_on_own_line('# [put your flag name here]');
  }

  //adds a goto (jumps to a flag) where the cursor is in the editor
  protected insert_goto() {
    this.insert_on_own_line('-> [flag name]');
  }

  //adds an end (the story finishes here) where the cursor is in the editor
  protected insert_end() {
    this.insert_on_own_line('END');
  }

  //adds a choice with this many options where the cursor is in the editor
  protected insert_choice(count: number) {
    const options = Array.from(
      { length: count },
      (_, i) => `[option ${i + 1} text] -> [flag name]`,
    );
    this.insert_on_own_line(['Choice:', ...options].join('\n'));
  }

  //puts text where the cursor is (replacing any selected text) and moves the cursor to the end of it.
  //flags and choices have to be on their own lines, so line breaks are added if there's text
  //before or after the cursor on the same line
  private insert_on_own_line(text: string) {
    const view = this.editorView;
    if (!view) {
      return;
    }

    const { from, to } = view.state.selection.main; //the cursor, or the selected text if there is some
    const startLine = view.state.doc.lineAt(from);
    const endLine = view.state.doc.lineAt(to);

    const textBefore = startLine.text.slice(0, from - startLine.from);
    const textAfter = endLine.text.slice(to - endLine.from);
    const before = textBefore.trim() !== '' ? '\n' : '';
    const after = textAfter.trim() !== '' ? '\n' : '';

    view.dispatch({
      changes: { from, to, insert: `${before}${text}${after}` },
      selection: { anchor: from + before.length + text.length }, //just after the inserted text
      scrollIntoView: true,
    });
    view.focus(); //clicking the button took focus away from the editor, give it back
  }

  //parse the script in the editor and open it in the reader to play through it
  protected preview() {
    const script = this.editorView?.state.doc.toString() ?? '';

    //the parser and toJSON throw an Error when the script has a mistake in it,
    //so show that message to the writer instead of opening the reader
    try {
      const ast = new Parser().produceAST(script);
      //the title from the metadata popup, author and id are temporary until stories are saved
      const json = toJSON(ast, {
        title: this.previewService.metadata().title || 'Untitled Story',
        author: 'Unknown author',
        story_id: 'preview', //not saved yet, so it has no real id
      });
      this.previewService.chapter.set({ title: json.title, lines: json.story.lines });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.previewError.set(message);
      //colour the line the error is on, if the message says which line
      this.editorView?.dispatch({ effects: set_error_line.of(line_from_error(message)) });
      return;
    }

    this.previewError.set(null);
    this.editorView?.dispatch({ effects: set_error_line.of(null) });
    this.save_script();
    this.router.navigate(['/preview']);
  }
}
