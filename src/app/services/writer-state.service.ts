import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { AssetRef } from '../../models/asset';
import { Draft } from '../../models/draft';
import { Character } from '../../models/story';
import { StoryMetadata } from '../../models/story-metadata';
import {
  find_emotion,
  images_of,
  placement_fields,
  remove_character,
  remove_emotion,
  set_image_url,
  update_emotion,
} from '../rules/characters-rules';
import { default_placement } from '../rules/placement';
import { AssetService } from './asset.service';
import { load_draft, save_draft } from './saved-values';

// the story_id used until the backend gives each new story a real one.
// once it does, open_story() is called with the real id instead and nothing else needs to change
export const PLACEHOLDER_STORY_ID = 'new-story';

// the metadata of a story that has none yet. a function, so each story gets its own object
function empty_metadata(): StoryMetadata {
  return { title: '', genres: [], description: '' };
}

// the writer's current work on the open story: the editor text, the metadata popup's details and the characters.
// saved in IndexedDB as one draft per story, so it survives a page reload or closing the browser
// (acts as an automatic draft until the real Save button exists)
@Injectable({ providedIn: 'root' }) // global singleton
export class WriterStateService {
  private assets = inject(AssetService); // the pictures used by the characters

  story_id = signal(PLACEHOLDER_STORY_ID); // which story is open
  script = signal<string | null>(null); // the editor text, so the writer gets it back
  metadata = signal<StoryMetadata>(empty_metadata()); // from the metadata popup
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
    this.metadata.set(saved?.metadata ?? empty_metadata());
    this.characters.set(saved?.characters ?? []);
    const used = new Set(images_of(this.characters()).map((image) => image.asset_id));
    await this.assets.restore(story_id, loaded ? used : null);
    this.opened.set(true);
  }

  // ---- changes to the characters that also affect their pictures.
  // changes that don't (names, descriptions, placement) are made with the functions in
  // characters-rules.ts straight on the characters signal

  // removes a character, and throws away its pictures straight away
  remove_character(id: string) {
    const removed = this.characters().filter((c) => c.id === id);
    this.characters.update((characters) => remove_character(characters, id));
    this.forget(images_of(removed));
  }

  // removes an emotion, and throws away its picture straight away
  remove_emotion(character_id: string, emotion_id: string) {
    const removed = find_emotion(this.characters(), character_id, emotion_id);
    this.characters.update((characters) => remove_emotion(characters, character_id, emotion_id));
    this.forget(removed?.image ? [removed.image] : []);
  }

  // takes an emotion's picture away (the emotion stays), and throws the picture away straight away
  remove_emotion_image(character_id: string, emotion_id: string) {
    const removed = find_emotion(this.characters(), character_id, emotion_id);
    this.characters.update((characters) =>
      update_emotion(characters, character_id, emotion_id, (e) => ({ ...e, image: null })),
    );
    this.forget(removed?.image ? [removed.image] : []);
  }

  // stores a new picture and puts it on an emotion, centred at 100% (the old position doesn't carry over).
  // story_id is the story that was open when the writer picked the picture: if another story has been
  // opened since, or the emotion is gone, nothing changes and false is given back.
  // the draft is saved straight away so it points at the new picture, then the replaced one is thrown away
  async set_emotion_image(
    story_id: string,
    character_id: string,
    emotion_id: string,
    picture: Blob,
  ): Promise<boolean> {
    if (this.story_id() !== story_id) {
      return false;
    }
    const image = await this.assets.add(story_id, picture);
    const emotion = find_emotion(this.characters(), character_id, emotion_id);
    if (this.story_id() !== story_id || !emotion) {
      await this.assets.forget(image.asset_id); // nothing uses it
      return false;
    }

    this.characters.update((characters) =>
      update_emotion(characters, character_id, emotion_id, (e) => ({
        ...e,
        image,
        ...placement_fields(default_placement),
      })),
    );
    await this.save_now();
    this.forget(emotion.image ? [emotion.image] : []);
    return true;
  }

  // a picture finished uploading to Azure: puts its real url in the story in place of the local copy.
  // the local copy is only dropped once the story with the url is saved, so the picture is never lost.
  // if the open story doesn't use the picture (the writer switched stories during the upload, or
  // removed the picture) nothing changes, and it's uploaded again the next time its story is opened
  async asset_uploaded(asset_id: string, url: string) {
    if (!images_of(this.characters()).some((image) => image.asset_id === asset_id)) {
      return;
    }
    this.characters.update((characters) => set_image_url(characters, asset_id, url));
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

  // throws away pictures that are no longer used. not waited for, the writer doesn't need to wait on it
  private forget(images: AssetRef[]) {
    for (const image of images) {
      void this.assets.forget(image.asset_id);
    }
  }
}
