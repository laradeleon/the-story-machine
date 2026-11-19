import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { Draft } from '../../models/draft';
import { Character } from '../../models/story';
import { StoryMetadata } from '../../models/story-metadata';
import { AssetService } from './asset.service';
import { load_draft, save_draft } from './saved-values';

// the story_id used until the backend gives each new story a real one.
// once it does, open_story() is called with the real id instead and nothing else needs to change
export const PLACEHOLDER_STORY_ID = 'new-story';

// the writer's current work on the open story: the editor text, the metadata popup's details and the characters.
// saved in IndexedDB as one draft per story, so it survives a page reload or closing the browser
// (acts as an automatic draft until the real Save button exists)
@Injectable({ providedIn: 'root' }) // global singleton
export class WriterStateService {
  private assets = inject(AssetService); // the pictures used by the characters

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

    // if IndexedDB can't be read the story starts empty, and the pictures it might use can't be known
    let saved: Draft | null = null;
    let loaded = true;
    try {
      saved = await load_draft(story_id);
    } catch {
      loaded = false;
    }
    this.story_id.set(story_id);
    this.script.set(saved?.script ?? null);
    this.metadata.set(saved?.metadata ?? { title: '', genres: [], description: '' });
    this.characters.set(saved?.characters ?? []);
    await this.assets.restore(story_id, loaded ? used_asset_ids(this.characters()) : null);
    this.opened.set(true);
  }

  // a picture finished uploading to Azure: puts its real url in the story in place of the local copy.
  // the local copy is only dropped once the story with the url is saved, so the picture is never lost.
  // if the open story doesn't use the picture (the writer switched stories during the upload, or
  // removed the picture) nothing changes, and it's uploaded again the next time its story is opened
  async asset_uploaded(asset_id: string, url: string) {
    if (!used_asset_ids(this.characters()).has(asset_id)) {
      return;
    }
    this.characters.update((characters) =>
      characters.map((character) => ({
        ...character,
        emotions: character.emotions.map((e) =>
          e.image?.asset_id === asset_id ? { ...e, image: { asset_id, url } } : e,
        ),
      })),
    );
    if (await this.save_now()) {
      await this.assets.uploaded(asset_id);
    }
  }

  // sets the script and starts writing the draft to IndexedDB straight away.
  // the effect above saves a moment after a change, which is too late when the page is being
  // refreshed or closed, so the writer uses this to start the save before the page is gone.
  // IndexedDB is async, so the save can still be cut off if the page closes first
  save_script_now(script: string) {
    this.script.set(script);
    return this.save_now();
  }

  // writes the open story's draft to IndexedDB straight away, instead of a moment later from the effect.
  // gives back whether it was saved
  save_now(): Promise<boolean> {
    return this.save(this.draft());
  }

  // writes the draft to IndexedDB with the time it was saved
  private save(draft: Omit<Draft, 'updated_at'>) {
    return save_draft({ ...draft, updated_at: Date.now() });
  }
}

// the asset_id of every picture the characters use
function used_asset_ids(characters: Character[]): Set<string> {
  const ids = new Set<string>();
  for (const character of characters) {
    for (const emotion of character.emotions) {
      if (emotion.image) ids.add(emotion.image.asset_id);
    }
  }
  return ids;
}
