import { effect, Injectable, signal } from '@angular/core';
import { Character } from '../../models/story';
import { StoryMetadata } from '../../models/story-metadata';
import { load, save } from './saved-values';

// the keys the writer's script and metadata are saved under in the browser's IndexedDB
const SCRIPT_KEY = 'story-machine:writer-script';
const METADATA_KEY = 'story-machine:writer-metadata';

// the writer's current work: the editor text, the metadata popup's details and the characters.
// the script and metadata are kept in IndexedDB so they survive a page reload or closing the browser
// (acts as an automatic draft until the real Save button exists)
@Injectable({ providedIn: 'root' }) // global singleton
export class WriterStateService {
  script = signal<string | null>(null); // the editor text, so the writer gets it back
  metadata = signal<StoryMetadata>({ title: '', genres: [], description: '' }); // from the metadata popup
  // the characters from the characters popup. kept in memory only: portrait images are data URLs
  // that are too big to save with the draft, so they are lost on a page reload for now
  characters = signal<Character[]>([]);

  // true once restore() has put the saved values back. nothing is saved before then,
  // otherwise the empty starting values above would overwrite the saved draft
  private restored = signal(false);

  constructor() {
    // whenever one of the signals changes (after restoring), save the new value
    effect(() => {
      const script = this.script();
      if (this.restored()) save(SCRIPT_KEY, script);
    });
    effect(() => {
      const metadata = this.metadata();
      if (this.restored()) save(METADATA_KEY, metadata);
    });
  }

  // loads the saved script and metadata from IndexedDB.
  // called once before the app starts (see app.config.ts), so pages never see the empty values
  async restore() {
    const [script, metadata] = await Promise.all([
      load(SCRIPT_KEY, this.script()),
      load(METADATA_KEY, this.metadata()),
    ]);
    this.script.set(script);
    this.metadata.set(metadata);
    this.restored.set(true);
  }

  // sets the script and starts writing it to IndexedDB straight away.
  // the effects above save a moment after a change, which is too late when the page is being
  // refreshed or closed, so the writer uses this to start the save before the page is gone.
  // IndexedDB is async, so the save can still be cut off if the page closes first
  save_script_now(script: string) {
    this.script.set(script);
    return save(SCRIPT_KEY, script);
  }
}
