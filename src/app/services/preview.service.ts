import { effect, inject, Injectable, signal } from '@angular/core';
import { Chapter } from '../../models/chapter';
import { StoryNode } from '../../scripting_language/ast';
import { toJSON } from '../../scripting_language/to_json';
import { DraftService } from './draft.service';
import { load, save } from './local-storage';

// the key the chapter is saved under in the browser's localStorage
const CHAPTER_KEY = 'story-machine:preview-chapter';

// passes the writer's parsed script to the reader when Preview is pressed.
// the writer and reader are different pages, a 'root' service is shared by both
// and stays alive when moving from one page to the other.
// also saved in localStorage so refreshing the /preview page still plays it
@Injectable({ providedIn: 'root' }) // global singleton
export class PreviewService {
  private draft = inject(DraftService); // the title comes from the writer's metadata

  chapter = signal<Chapter | null>(load(CHAPTER_KEY, null)); // the parsed script for the reader to play

  constructor() {
    // whenever the chapter changes, save the new value
    effect(() => save(CHAPTER_KEY, this.chapter()));
  }

  // turns the parser's AST into the chapter the reader plays.
  // throws an Error (from toJSON) when the script has a mistake in it, e.g. a goto to a missing flag
  build_preview(ast: StoryNode) {
    // the title from the metadata popup, author and id are temporary until stories are saved
    const json = toJSON(ast, {
      title: this.draft.metadata().title || 'Untitled Story',
      author: 'Unknown author',
      story_id: 'preview', // not saved yet, so it has no real id
    });
    this.chapter.set({ title: json.title, lines: json.story.lines });
  }
}
