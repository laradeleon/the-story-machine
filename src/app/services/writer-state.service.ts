import { computed, effect, Injectable, signal } from '@angular/core';
import { Draft } from '../../models/draft';
import { Character } from '../../models/story';
import { StoryMetadata } from '../../models/story-metadata';
import { load_draft, save_draft } from './saved-values';

// the story_id used until the backend gives each new story a real one.
// once it does, open_story() is called with the real id instead and nothing else needs to change
export const PLACEHOLDER_STORY_ID = 'new-story';

// the writer's current work on the open story: the editor text, the metadata popup's details and the characters.
// saved in IndexedDB as one draft per story, so it survives a page reload or closing the browser
// (acts as an automatic draft until the real Save button exists)
@Injectable({ providedIn: 'root' }) // global singleton
export class WriterStateService {
  story_id = signal(PLACEHOLDER_STORY_ID); // which story is open
  script = signal<string | null>(null); // the editor text, so the writer gets it back
  metadata = signal<StoryMetadata>({ title: '', genres: [], description: '' }); // from the metadata popup
  characters = signal<Character[]>([]); // from the characters popup

  // true once open_story() has put the saved draft back. nothing is saved before then,
  // otherwise the empty starting values above would overwrite the saved draft
  private opened = signal(false);

  // the open story's work, in the shape it's saved in (updated_at is filled in when saving)
  private draft = computed<Omit<Draft, 'updated_at'>>(() => ({
    story_id: this.story_id(),
    script: this.script(),
    metadata: this.metadata(),
    characters: this.characters(),
  }));

  constructor() {
    // whenever any part of the draft changes (after opening), save it
    effect(() => {
      const draft = this.draft();
      if (this.opened()) this.save(draft);
    });
  }

  // loads a story's saved draft (or starts it empty if it has none) and makes it the open story.
  // called once before the app starts (see app.config.ts), so pages never see the empty values.
  // when the backend gives out story ids this is called with the real one, e.g. from a route resolver
  async open_story(story_id = PLACEHOLDER_STORY_ID) {
    // save the story that's open now first, so switching doesn't lose any of it
    if (this.opened()) {
      this.opened.set(false);
      await this.save(this.draft());
    }

    const saved = await load_draft(story_id);
    this.story_id.set(story_id);
    this.script.set(saved?.script ?? null);
    this.metadata.set(saved?.metadata ?? { title: '', genres: [], description: '' });
    this.characters.set(saved?.characters ?? []);
    this.opened.set(true);
  }

  // sets the script and starts writing the draft to IndexedDB straight away.
  // the effect above saves a moment after a change, which is too late when the page is being
  // refreshed or closed, so the writer uses this to start the save before the page is gone.
  // IndexedDB is async, so the save can still be cut off if the page closes first
  save_script_now(script: string) {
    this.script.set(script);
    return this.save(this.draft());
  }

  // writes the draft to IndexedDB with the time it was saved
  private save(draft: Omit<Draft, 'updated_at'>) {
    return save_draft({ ...draft, updated_at: Date.now() });
  }
}
