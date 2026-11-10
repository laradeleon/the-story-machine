import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PreviewService } from '../../services/preview.service';
import { DraftService } from '../../services/draft.service';
import { MetadataDialog } from '../../components/metadata-dialog/metadata-dialog';
import { ComingSoonDialog } from '../../components/coming-soon-dialog/coming-soon-dialog';
import { AstDialog } from '../../components/ast-dialog/ast-dialog';
import Parser, { MAX_OPTIONS } from '../../../scripting_language/parser';
import { StoryNode } from '../../../scripting_language/ast';
import { line_from_error, set_error_line } from './error-line';
import { create_editor } from './editor-setup';
import { choice_snippet, insert_on_own_line, SNIPPETS } from './editor-commands';
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
  imports: [RouterLink, MetadataDialog, ComingSoonDialog, AstDialog],
  selector: 'app-writer',
  styleUrl: './writer.css',
  templateUrl: './writer.html',
  host: {
    //the browser is refreshing or closing the page, which skips onDestroy, so save here too
    '(window:pagehide)': 'save_script()',
  },
})
export class Writer {
  //the CodeMirror editor, made once the page has rendered
  editorView?: EditorView;

  private previewService = inject(PreviewService); //plays the script in the reader when Preview is pressed
  protected draft = inject(DraftService); //protected so the template can use the metadata in it
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  //the div in the .html the editor goes in
  private editorHost = viewChild.required<ElementRef<HTMLElement>>('editor');

  //whether the metadata popup is showing
  protected metadataOpen = signal(false);

  //TEMPORARY: the name of the unfinished button that was clicked, shown in the coming soon popup.
  //null when the popup is closed
  protected comingSoon = signal<string | null>(null);

  //the numbered buttons next to "Choice", each adds a choice with that many options
  protected choiceCounts = Array.from({ length: MAX_OPTIONS }, (_, i) => i + 1); //[1, 2, 3, 4], the parser's limit

  //the parser's error message when the script has a mistake in it, null when there isn't one
  protected previewError = signal<string | null>(null);

  //the parser's AST as formatted text, shown in the AST popup. null when the popup is closed
  protected astOutput = signal<string | null>(null);

  constructor() {
    //the editor div only exists once the page has rendered
    afterNextRender(() => {
      this.editorView = create_editor(
        this.editorHost().nativeElement,
        //coming back to the writer puts the script back how it was left, otherwise start with the example
        //replace with chapter text when editing a chapter
        this.draft.script() ?? exampleStory,
        () => this.previewError.set(null),
      );
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

  //the text in the editor, empty if the editor hasn't been made yet
  private current_script(): string {
    return this.editorView?.state.doc.toString() ?? '';
  }

  //saves the editor's text to the draft service and localStorage.
  //only done when leaving the page, refreshing/closing it or pressing Preview, not on every
  //keystroke, so typing doesn't slow down as the story gets longer
  protected save_script() {
    if (this.editorView) {
      this.draft.save_script_now(this.current_script());
    }
  }

  //adds a flag where the cursor is in the editor, with a placeholder for the writer to replace
  protected insert_flag() {
    this.insert(SNIPPETS.flag);
  }

  //adds a goto (jumps to a flag) where the cursor is in the editor
  protected insert_goto() {
    this.insert(SNIPPETS.goto);
  }

  //adds an end (the story finishes here) where the cursor is in the editor
  protected insert_end() {
    this.insert(SNIPPETS.end);
  }

  //adds a choice with this many options where the cursor is in the editor
  protected insert_choice(count: number) {
    this.insert(choice_snippet(count));
  }

  //puts text on its own line where the cursor is, see editor-commands.ts
  private insert(text: string) {
    if (this.editorView) {
      insert_on_own_line(this.editorView, text);
    }
  }

  //parse the script in the editor and show the AST the parser made, before it's turned into JSON
  protected show_ast() {
    const ast = this.parse_script();
    if (ast) {
      this.astOutput.set(JSON.stringify(ast, null, 2)); //indented 2 spaces so it's readable
    }
  }

  //parse the script in the editor and open it in the reader to play through it
  protected preview() {
    const ast = this.parse_script();
    if (!ast) {
      return;
    }

    //toJSON also throws when the script has a mistake, e.g. a goto to a flag that doesn't exist
    try {
      this.previewService.build_preview(ast);
    } catch (error) {
      this.show_parse_error(error);
      return;
    }

    this.save_script();
    this.router.navigate(['/preview']);
  }

  //runs the parser on the script in the editor.
  //the parser throws an Error when the script has a mistake in it, so that message is shown
  //to the writer and null is given back. otherwise any old error is cleared
  private parse_script(): StoryNode | null {
    try {
      const ast = new Parser().produceAST(this.current_script());
      this.clear_parse_error();
      return ast;
    } catch (error) {
      this.show_parse_error(error);
      return null;
    }
  }

  //shows the parser's error message under the editor and colours the line it's on,
  //if the message says which line
  private show_parse_error(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    this.previewError.set(message);
    this.editorView?.dispatch({ effects: set_error_line.of(line_from_error(message)) });
  }

  //hides the error message and the line colouring once the script parses again
  private clear_parse_error() {
    this.previewError.set(null);
    this.editorView?.dispatch({ effects: set_error_line.of(null) });
  }
}
