import { effect, inject, Injectable, signal } from '@angular/core';
import { Chapter } from '../../models/chapter';
import { StoryJSON } from '../../models/story';
import { load, save } from './saved-values';
import { WriterStateService } from './writer-state.service';

// the key the chapter is saved under in the browser's IndexedDB
const CHAPTER_KEY = 'story-machine:preview-chapter';

// passes the writer's parsed script to the reader when Preview is pressed.
// the writer and reader are different pages, a 'root' service is shared by both
// and stays alive when moving from one page to the other.
// also saved in IndexedDB so refreshing the /preview page still plays it
@Injectable({ providedIn: 'root' }) // global singleton
export class PreviewService {
  private state = inject(WriterStateService); // the title comes from the writer's metadata

  chapter = signal<Chapter | null>(null); // the parsed script for the reader to play

  // false until restore() runs, so the empty start value isn't saved over the saved chapter
  private restored = signal(false);

  constructor() {
    // whenever the chapter changes (after restoring), save the new value
    effect(() => {
      const chapter = this.chapter();
      if (this.restored()) save(CHAPTER_KEY, chapter);
    });
  }

  // puts the saved chapter back, unless a newer one was built while loading
  async restore() {
    const saved = await load<Chapter | null>(CHAPTER_KEY, null);
    if (this.chapter() === null) this.chapter.set(saved);
    this.restored.set(true);
  }

  // makes the chapter the reader plays from the script's story JSON (the writer has already
  // checked it for mistakes), with the title from the metadata popup
  build_preview(script: StoryJSON['story']) {
    this.chapter.set({
      title: this.state.metadata().title || 'Untitled Story',
      lines: script.lines,
    });
  }
}
