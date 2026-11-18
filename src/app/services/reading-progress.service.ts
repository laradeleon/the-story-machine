import { Injectable, inject, signal, untracked } from '@angular/core';
import { AuthService } from './auth.service';
import { load, save } from './local-storage';

// where a reader is in a story
// tracking line id is enough to make sure they always stay on the branch they chose, as picking a choice jumps to
// that branch's lines, so clearing a position also clears the choices that led there
export interface ReadingPosition {
  chapterIndex: number; // 0 = first chapter
  lineId: number | null; // null = chapter title page
}

// what gets saved for each story is the position IN the story they were at and when they last read it
// so the continue reading list can put the most recently read story first
interface SavedEntry extends ReadingPosition {
  lastReadAt: number; // a timestamp in milliseconds
}

// every story's saved entry for one reader by story id
type SavedProgress = Record<string, SavedEntry>;

// before putting the reader back into their old position, make sure it's a real position (couldve beem edited from dev tools)
// if it isn't, just act like they haven't started the story so it opens from the beginning
function isUsablePosition(position: ReadingPosition | undefined): position is ReadingPosition {
  return (
    !!position && // progress was saved somewhere for this story
    Number.isInteger(position.chapterIndex) && // chapter is whole number
    position.chapterIndex >= 0 &&
    (position.lineId === null || (Number.isInteger(position.lineId) && position.lineId >= 0))
  );
}

// when a story was last read to show them in the order of last opened in the continue reading list
function lastReadTime(entry: SavedEntry): number {
  if (Number.isFinite(entry.lastReadAt)) {
    return entry.lastReadAt;
  }
  return 0;
}

/**
 * ReadingProgressService
 *
 * This tracks where the reader stopped reading a story
 * - tracked per reader (based on id or "guest" if theyre signed out) and per story
 * - saved in the browser
 * - get() and inProgressStoryIds() update by themselves when progress is saved or cleared,
 *   or when someone signs in or out, so pages showing progress stay up to date
 */
@Injectable({ providedIn: 'root' }) // singleton
export class ReadingProgressService {
  private auth = inject(AuthService);

  // goes up by one every time progress is saved or cleared
  private changes = signal(0); // get() and inProgressStoryIds() read this

  // the saved position in this story or null if they just havent started it
  get(storyId: string): ReadingPosition | null {
    this.changes(); // rerun when progress changes
    const entry = this.loadAll()[storyId];
    if (!isUsablePosition(entry)) {
      return null;
    }
    // only the position, the reader doesn't need to know when it was last read
    return { chapterIndex: entry.chapterIndex, lineId: entry.lineId };
  }

  // ids of every story this reader has started but not finished, for the continue reading list
  // the most recently read story comes firs
  inProgressStoryIds(): string[] {
    this.changes(); // rerun when progress changes
    return Object.entries(this.loadAll())
      .filter(([, entry]) => isUsablePosition(entry))
      .sort(([, a], [, b]) => lastReadTime(b) - lastReadTime(a)) // newest first
      .map(([storyId]) => storyId);
  }

  // called by the reader everytime user goes to the next line and when a story is opened
  // at its saved place so lastReadAt is always when they last had the story open
  save(storyId: string, position: ReadingPosition) {
    untracked(() =>
      save(this.storageKey(), {
        ...this.loadAll(),
        [storyId]: { ...position, lastReadAt: Date.now() },
      }),
    );
    this.changes.update((count) => count + 1);
  }

  // forgets this story's position (and with it the choices they made) so it opens from the beginning next time
  clear(storyId: string) {
    untracked(() => {
      const remaining = Object.fromEntries(
        Object.entries(this.loadAll()).filter(([savedStoryId]) => savedStoryId !== storyId),
      );
      save(this.storageKey(), remaining);
    });
    this.changes.update((count) => count + 1);
  }

  private loadAll(): SavedProgress {
    const saved = load<SavedProgress | null>(this.storageKey(), {});
    // for the same reasons as isUsablePosition() w dev tools, what's saved might not be a list of positions at all
    // so anything that isn't a position = nothing saved instead of just crashing
    if (saved && typeof saved === 'object') {
      return saved;
    }
    return {};
  }

  // each reader gets their own saved progress, so signing in or out switches to theirs
  private storageKey() {
    return `tsm_reading_progress_${this.auth.currentUser()._id}`;
  }
}
