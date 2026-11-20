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
import { ComingSoonDialog } from '../../components/coming-soon-dialog/coming-soon-dialog';
import { AstDialog } from '../../components/ast-dialog/ast-dialog';
import Parser, { MAX_OPTIONS } from '../../../scripting_language/parser';
import { StoryNode } from '../../../scripting_language/ast';
import { line_from_error, set_error_line } from './error-line';
import { create_editor } from './editor-setup';
import { choice_snippet, insert_on_own_line, SNIPPETS } from './editor-commands';
import { EditorView } from '@codemirror/view';
import { StoryService } from '../../services/story.service';
import { to_character_requests } from '../../rules/characters-rules';

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
  imports: [RouterLink, MetadataDialog, CharactersDialog, ComingSoonDialog, AstDialog],
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
  private storyService = inject(StoryService); //creates and publishes the story on the backend

  //the div in the .html the editor goes in
  private editorHost = viewChild.required<ElementRef<HTMLElement>>('editor');

  //whether the metadata popup is showing
  protected metadataOpen = signal(false);

  //whether the characters popup is showing
  protected charactersOpen = signal(false);

  //TEMPORARY: the name of the unfinished button that was clicked, shown in the coming soon popup.
  //null when the popup is closed
  protected comingSoon = signal<string | null>(null);

  //the numbered buttons next to "Choice", each adds a choice with that many options
  protected choiceCounts = Array.from({ length: MAX_OPTIONS }, (_, i) => i + 1); //[1, 2, 3, 4], the parser's limit

  //the parser's error message when the script has a mistake in it, null when there isn't one
  protected previewError = signal<string | null>(null);

  //the parser's AST as formatted text, shown in the AST popup. null when the popup is closed
  protected astOutput = signal<string | null>(null);

  //while Save Draft is sending the story to the backend
  protected saving = signal(false);

  //"Draft saved." or why the last save didn't work, null before the first save
  protected saveMessage = signal<string | null>(null);

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

  private async publishChapter() {
    if (this.has_title()) {
      // the open story's id, the same one that's in the url. Write Story made it on the backend
      const storyID = this.state.story_id();
      console.log(storyID);
      //call POST/api/v1/story/{storyID}/chapter
      //get lines[] JSON from parser
      try {
        const ast = this.parse_script();
        const storyInfo = {
          title: this.state.metadata().title,
          author: 'Test',
          story_id: storyID,
        };
        if (ast) {
          const response = await this.storyService.postChapter(
            storyID,
            'Chapter 1',
            ast,
            storyInfo,
          );
          //set storyID to the returned value
          console.log(response);
        }
      } catch (error) {
        console.error('Caught story Chapter POST error\n' + error);
      }
      //call PATCH/api/v1/story/{storyID}
      //set status to "published", with the title and description from the metadata popup
      //(the story was made as "Untitled story" by Write Story)
      try {
        const response = await this.storyService.patchStory(storyID, {
          status: 'published',
          title: this.state.metadata().title,
          description: this.state.metadata().description,
        });
        //set storyID to the returned value
        console.log(response);
      } catch (error) {
        console.error('Caught story PATCH error\n' + error);
      }

      //run save_draft() as well
    } else {
      //change to a dedicated error message for missing metadata
      this.comingSoon.set('publish');
    }
  }

  //saves the script, title, description and characters to the backend without publishing
  protected async save_draft() {
    this.save_script(); //keep a local copy first, like Preview does
    this.saving.set(true);
    this.saveMessage.set(null);
    const story_id = this.state.story_id();
    const metadata = this.state.metadata();
    try {
      await this.storyService.patchStory(story_id, {
        //the backend won't take a blank title, so the story keeps the one it has
        ...(metadata.title.trim() ? { title: metadata.title } : {}),
        description: metadata.description,
        characters: to_character_requests(this.state.characters()),
      });
      await this.storyService.upload_script(story_id, this.current_script());
      this.saveMessage.set('Draft saved.');
    } catch {
      this.saveMessage.set("Sorry, the draft couldn't be saved. Please try again.");
    } finally {
      this.saving.set(false);
    }
  }
}
