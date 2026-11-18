import { effect, Injectable, signal } from '@angular/core';
import { Character } from '../../models/story';
import { StoryMetadata } from '../../models/story-metadata';
import { load, save } from './local-storage';

// the keys the writer's script and metadata are saved under in the browser's localStorage
const SCRIPT_KEY = 'story-machine:writer-script';
const METADATA_KEY = 'story-machine:writer-metadata';

// the writer's current work: the editor text, the metadata popup's details and the characters.
// the script and metadata are kept in localStorage so they survive a page reload or closing the browser
// (acts as an automatic draft until the real Save button exists)
@Injectable({ providedIn: 'root' }) // global singleton
export class WriterStateService {
  script = signal<string | null>(load(SCRIPT_KEY, null)); // the editor text, so the writer gets it back
  metadata = signal<StoryMetadata>(load(METADATA_KEY, { title: '', genres: [], description: '' })); // from the metadata popup
  // the characters from the characters popup. kept in memory only: portrait images are data URLs
  // that are too big for localStorage, so they are lost on a page reload for now
  characters = signal<Character[]>([]);

  constructor() {
    // whenever one of the signals changes, save the new value
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
