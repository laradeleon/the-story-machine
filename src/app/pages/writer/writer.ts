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
import { WriterStateService } from '../../services/writer-state.service';
import { MetadataDialog } from '../../components/metadata-dialog/metadata-dialog';
import { CharactersDialog } from '../../components/characters-dialog/characters-dialog';
import { ErrorDialog } from '../../components/error-dialog/error-dialog';
import { AstDialog } from '../../components/ast-dialog/ast-dialog';
import Parser, { MAX_OPTIONS } from '../../../scripting_language/parser';
import { StoryNode } from '../../../scripting_language/ast';
import { line_from_error, set_error_line } from './error-line';
import { create_editor } from './editor-setup';
import { choice_snippet, insert_on_own_line, SNIPPETS } from './editor-commands';
import { EditorView } from '@codemirror/view';
import { StoryService } from '../../services/story.service';
import { to_character_requests } from '../../rules/characters-rules';
import { toJSON } from '../../../scripting_language/to_json';
import { StoryJSON } from '../../../models/story';
import { api_reason } from '../../services/api-errors';

const exampleStory = `Welcome to The Story Machine.

This is a platform for writing, reading and sharing interactive fiction.

You can just have text show up by just writing it on its own like so

Hello, world.

Dialogue is shown with quotes and by specifying the character before

For example
Arthur: "Good morning Lauren, welcome to Interactive fiction!"
Paul: "We worked very hard on this, Adejare and I got zero sleep!"
Adejare looks at you with sleepless eyes.
Krupal: "Wake up dude.."

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
  imports: [RouterLink, MetadataDialog, CharactersDialog, ErrorDialog, AstDialog],
  selector: 'app-writer',
  styleUrl: './writer.css',
  templateUrl: './writer.html',
  host: {
    //the browser is refreshing or closing the page, which skips onDestroy, so save here too
    '(window:pagehide)': 'save_script()',
    //the tab was hidden. fires earlier and more reliably than pagehide, especially on phones
    '(document:visibilitychange)': 'save_script_if_hidden()',
  },
})
export class Writer {
  //the CodeMirror editor, made once the page has rendered
  editorView?: EditorView;

  private previewService = inject(PreviewService); //plays the script in the reader when Preview is pressed
  protected state = inject(WriterStateService); //protected so the template can use the metadata in it
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private storyService = inject(StoryService);

  //the div in the .html the editor goes in
  private editorHost = viewChild.required<ElementRef<HTMLElement>>('editor');

  //whether the metadata popup is showing
  protected metadataOpen = signal(false);

  //whether the characters popup is showing
  protected charactersOpen = signal(false);

  //the numbered buttons next to "Choice", each adds a choice with that many options
  protected choiceCounts = Array.from({ length: MAX_OPTIONS }, (_, i) => i + 1); //[1, 2, 3, 4], the parser's limit

  //what's wrong with the story when Preview or Publish can't use it (a mistake in the script,
  //or no title to publish with), null when there isn't anything
  protected previewError = signal<string | null>(null);

  //the parser's AST as formatted text, shown in the AST popup. null when the popup is closed
  protected astOutput = signal<string | null>(null);

  //what's being sent to the backend, so Save Draft and Publish can't run at the same time
  protected busy = signal<'saving' | 'publishing' | null>(null);

  //"Draft saved." or "Story published." after the last one worked
  protected statusMessage = signal<string | null>(null);

  //what went wrong talking to the backend, shown in a popup. null when the popup is closed
  protected apiError = signal<{ title: string; message: string } | null>(null);

  constructor() {
    //the editor div only exists once the page has rendered
    afterNextRender(() => {
      this.editorView = create_editor(
        this.editorHost().nativeElement,
        //the open story's script (opened by the route before this page), or the example for a new story
        this.state.script() ?? exampleStory,
        () => this.previewError.set(null),
        //the autosave waits for typing to stop, so a missed pagehide loses half a second at most
        (text) => this.state.script.set(text),
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

  //saves the editor's text straight away (on leave, refresh, hiding the tab or Preview), skipping the autosave's wait
  protected save_script() {
    if (this.editorView) {
      this.state.save_script_now(this.current_script());
    }
  }

  protected save_script_if_hidden() {
    if (document.hidden) {
      this.save_script();
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

  //turn the script in the editor into story JSON and open it in the reader to play through it
  protected preview() {
    const script = this.script_json();
    if (!script) {
      return; //the mistake is already showing under the editor
    }

    this.previewService.build_preview(script);
    this.save_script();
    this.router.navigate(['/preview', this.state.story_id()]);
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
    this.editorView?.dispatch({ effects: set_error_line.of(line_from_error(error)) });
  }

  //hides the error message and the line colouring once the script parses again
  private clear_parse_error() {
    this.previewError.set(null);
    this.editorView?.dispatch({ effects: set_error_line.of(null) });
  }

  //a story needs a title to be published, genres and description can be left blank.
  //spaces don't count, the backend trims them and would turn the title away
  private has_title(): boolean {
    return this.state.metadata().title.trim() !== '';
  }

  //shows why the story can't be published under the editor, where Preview's mistakes go
  private show_problem(message: string) {
    this.clear_parse_error(); //an old line highlight would point at the wrong thing
    this.previewError.set(message);
  }

  //turns the script into story JSON, the one place Preview and Publish both check it.
  //a mistake is shown under the editor with its line coloured, and null is given back
  private script_json(): StoryJSON['story'] | null {
    const ast = this.parse_script();
    if (!ast) {
      return null;
    }
    //toJSON also throws when the script has a mistake, e.g. a goto to a flag that doesn't exist
    try {
      //only the story part is kept, so the title and author don't matter here.
      //names are trimmed like Save Draft sends them, so the check matches the backend's
      const character_names = this.state.characters().map((c) => c.name.trim());
      const info = { title: '', author: '', story_id: this.state.story_id() };
      return toJSON(ast, info, character_names).story;
    } catch (error) {
      this.show_parse_error(error);
      return null;
    }
  }

  //sends the title, description, characters and script to the backend. throws if any of it fails
  private async save_to_backend(story_id: string) {
    const metadata = this.state.metadata();
    await this.storyService.update_story(story_id, {
      //the backend won't take a blank title, so the story keeps the one it has
      ...(this.has_title() ? { title: metadata.title } : {}),
      description: metadata.description,
      characters: to_character_requests(this.state.characters()),
    });
    await this.storyService.upload_script(story_id, this.current_script());
  }

  //runs Save Draft's or Publish's requests for the open story. only one runs at a time, or their
  //requests would mix. shows the done message when it works and a popup when the backend doesn't
  private async send_to_backend(
    busy: 'saving' | 'publishing',
    failed_title: string,
    send: (story_id: string) => Promise<string>, //gives back the message for when it worked
  ) {
    if (this.busy() !== null) {
      return;
    }
    this.save_script(); //keep a local copy first, like Preview does
    this.busy.set(busy);
    this.statusMessage.set(null);
    try {
      this.statusMessage.set(await send(this.state.story_id()));
    } catch (error) {
      this.apiError.set({ title: failed_title, message: api_reason(error) });
    } finally {
      this.busy.set(null);
    }
  }

  //saves the script, title, description and characters to the backend without publishing
  protected save_draft() {
    return this.send_to_backend('saving', "Couldn't save the draft", async (story_id) => {
      await this.save_to_backend(story_id);
      return 'Draft saved.';
    });
  }

  //checks the story first and stops before saving anything if it can't be published.
  //then saves the draft, saves the script as the story's chapter, and publishes it
  protected publish() {
    if (this.busy() !== null) {
      return; //checked before the checks too, so they don't show problems while it's busy
    }
    if (!this.has_title()) {
      this.show_problem('Give the story a title in Metadata before publishing it.');
      return;
    }
    const script = this.script_json();
    if (!script) {
      return; //the mistake is already showing under the editor
    }
    if (script.lines.length === 0) {
      this.show_problem('Write the story before publishing it.');
      return;
    }

    return this.send_to_backend('publishing', "Couldn't publish the story", async (story_id) => {
      //the characters are saved before the chapter, the backend checks its dialogue against them
      await this.save_to_backend(story_id);
      await this.storyService.save_chapter(story_id, script);
      //last, so readers can't see the story until its chapter is saved
      await this.storyService.update_story(story_id, { status: 'published' });
      return 'Story published.';
    });
  }
}
