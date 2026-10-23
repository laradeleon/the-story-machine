import { effect, Injectable, signal } from '@angular/core';
import { Chapter } from '../../models/chapter';
import { StoryMetadata } from '../../models/story-metadata';

// the keys everything is saved under in the browser's localStorage
const CHAPTER_KEY = 'story-machine:preview-chapter';
const SCRIPT_KEY = 'story-machine:writer-script';
const METADATA_KEY = 'story-machine:writer-metadata';

// passes the writer's script to the reader when Preview is pressed.
// the writer and reader are different pages, a 'root' service is shared by both
// and stays alive when moving from one page to the other.
// everything is also kept in localStorage so it survives a page reload or closing the browser
// (acts as an automatic draft until the real Save button exists)
@Injectable({ providedIn: 'root' }) // global singleton
export class PreviewService {
  chapter = signal<Chapter | null>(load(CHAPTER_KEY, null)); // the parsed script for the reader to play
  script = signal<string | null>(load(SCRIPT_KEY, null)); // the editor text, so the writer gets it back
  metadata = signal<StoryMetadata>(load(METADATA_KEY, { title: '', genres: [], description: '' })); // from the metadata popup

  constructor() {
    // whenever one of the signals changes, save the new value
    effect(() => save(CHAPTER_KEY, this.chapter()));
    effect(() => save(SCRIPT_KEY, this.script()));
    effect(() => save(METADATA_KEY, this.metadata()));
  }

  // sets the script and writes it to localStorage straight away.
  // the effects above save a moment after a change, which is too late when the page is being
  // refreshed or closed, so the writer uses this to make sure the script is stored before it's gone
  save_script_now(script: string) {
    this.script.set(script);
    save(SCRIPT_KEY, script);
  }
}

// reads a saved value, or gives back the fallback if nothing was saved.
// localStorage can throw (blocked by the browser, private mode, broken saved data),
function load<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved === null ? fallback : (JSON.parse(saved) as T);
  } catch {
    return fallback;
  }
}

// saves a value, or removes it when it's null
function save(key: string, value: unknown) {
  try {
    if (value === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    // storage is full or blocked, the value is still kept in memory for this visit
  }
}
