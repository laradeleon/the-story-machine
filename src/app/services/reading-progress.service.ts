import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { load, save } from './local-storage';

// where a reader is in a story
export interface ReadingPosition {
  chapterIndex: number; // 0 = first chapter
  lineId: number | null; // null = chapter title page
}

// every story's saved position for one reader by story id
type SavedProgress = Record<string, ReadingPosition>;

/**
 * ReadingProgressService
 *
 * This tracks where the reader stopped reading a story
 * - tracked per reader (based on id or "guest" if theyre signed out) and per story
 * - saved in the browser
 */
@Injectable({ providedIn: 'root' }) // singleton
export class ReadingProgressService {
  private auth = inject(AuthService);

  // the saved position in this story or null if they just havent started it
  get(storyId: string): ReadingPosition | null {
    const position = this.loadAll()[storyId];
    // saved position comes from localStorage, which can be changed in dev tools
    // so before the reader opens at it, make sure it's a real position
    // if it isn't, just act like they haven't started the story so it opens from the beginning
    if (
      !position || // nothing saved for this story
      !Number.isInteger(position.chapterIndex) || // chapter has to be a whole number
      position.chapterIndex < 0 || // and can't be before the first chapter
      !(position.lineId === null || (Number.isInteger(position.lineId) && position.lineId >= 0))
    ) {
      return null;
    }
    return position;
  }

  save(storyId: string, position: ReadingPosition) {
    save(this.storageKey(), { ...this.loadAll(), [storyId]: position });
  }

  // forgets this story's position so it opens from the beginning next time
  clear(storyId: string) {
    const remaining = Object.fromEntries(
      Object.entries(this.loadAll()).filter(([savedStoryId]) => savedStoryId !== storyId),
    );
    save(this.storageKey(), remaining);
  }

  private loadAll(): SavedProgress {
    const saved = load<SavedProgress | null>(this.storageKey(), {});
    // for the same reasons as in get() w dev tool, what's saved might not be a list of positions at all
    // so anything that isn't a position = nothing saved instead of just crashing
    return saved && typeof saved === 'object' ? saved : {};
  }

  // each reader gets their own saved progress, so signing in or out switches to theirs
  private storageKey() {
    return `tsm_reading_progress_${this.auth.currentUser()._id}`;
  }
}
