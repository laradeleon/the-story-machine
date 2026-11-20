import { computed, DestroyRef, effect, inject, Injectable, signal } from '@angular/core';
import { CharacterResponse } from '../../models/api';
import { AssetRef } from '../../models/asset';
import { Draft } from '../../models/draft';
import { SavedStory } from '../../models/saved-story';
import { Character } from '../../models/story';
import { StoryMetadata } from '../../models/story-metadata';
import {
  find_emotion,
  from_character_responses,
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

// the story_id used until the backend gives each new story a real one
export const PLACEHOLDER_STORY_ID = 'new-story';

// ms to wait after the last change before saving, so a burst of changes is one save
export const SAVE_DELAY = 500;

function empty_metadata(): StoryMetadata {
  return { title: '', genres: [], description: '' };
}

// the writer's work on the open story, autosaved to IndexedDB as one draft per story
@Injectable({ providedIn: 'root' })
export class WriterStateService {
  private assets = inject(AssetService);

  story_id = signal(PLACEHOLDER_STORY_ID);
  script = signal<string | null>(null); // the editor text
  metadata = signal<StoryMetadata>(empty_metadata());
  characters = signal<Character[]>([]);

  // false until open_story() has loaded the draft, so the empty starting values aren't saved over it
  private opened = false;

  // when the open story's draft was last saved, null if it had none or it couldn't be read
  private draft_updated_at: number | null = null;

  // the latest open_story call, so opens run one at a time
  private opening: Promise<void> = Promise.resolve();

  // the draft as it's saved (updated_at is added when saving)
  private draft = computed<Omit<Draft, 'updated_at'>>(() => ({
    story_id: this.story_id(),
    script: this.script(),
    metadata: this.metadata(),
    characters: this.characters(),
  }));

  private save_timer: ReturnType<typeof setTimeout> | null = null;

  // the draft last saved or loaded, so the effect doesn't save it again
  private last_saved: Omit<Draft, 'updated_at'> | null = null;

  constructor() {
    // save once the draft stops changing
    effect(() => {
      const draft = this.draft();
      if (this.opened && draft !== this.last_saved) this.save_later();
    });
    inject(DestroyRef).onDestroy(() => this.cancel_save_later());
  }

  // saves the open story, then loads another one, waiting for any open already running
  open_story(story_id: string): Promise<void> {
    const open = () => this.switch_story(story_id);
    this.opening = this.opening.then(open, open);
    return this.opening;
  }

  // loads a story (empty if it has no draft), saving the open one first. does nothing if it's already open
  private async switch_story(story_id: string) {
    if (this.opened && this.story_id() === story_id) {
      return;
    }
    if (this.opened) {
      this.opened = false;
      await this.save_now();
    }

    let saved: Draft | null = null;
    let loaded = true;
    try {
      saved = await load_draft(story_id);
    } catch {
      loaded = false;
    }
    this.story_id.set(story_id);
    this.draft_updated_at = saved?.updated_at ?? null;
    this.script.set(saved?.script ?? null);
    this.metadata.set(saved?.metadata ?? empty_metadata());
    this.characters.set(saved?.characters ?? []);
    // null if the draft couldn't be read, so no picture is thrown away as unused
    const used = loaded
      ? new Set(images_of(this.characters()).map((image) => image.asset_id))
      : null;
    await this.assets.restore(story_id, used);
    this.last_saved = this.draft();
    this.opened = true;
  }

  // removes a character and throws away its pictures
  remove_character(id: string) {
    const removed = this.characters().find((c) => c.id === id);
    this.characters.update((characters) => remove_character(characters, id));
    void this.save_then_forget(...images_of(removed ? [removed] : []));
  }

  // removes an emotion and throws away its picture
  remove_emotion(character_id: string, emotion_id: string) {
    this.change_emotion_and_forget_image(character_id, emotion_id, (characters) =>
      remove_emotion(characters, character_id, emotion_id),
    );
  }

  // throws away an emotion's picture, keeping the emotion
  remove_emotion_image(character_id: string, emotion_id: string) {
    this.change_emotion_and_forget_image(character_id, emotion_id, (characters) =>
      update_emotion(characters, character_id, emotion_id, (e) => ({ ...e, image: null })),
    );
  }

  // puts a new picture on an emotion, unless the story changed or the emotion is gone (gives back false)
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
    // checked again, the writer may have switched stories while it was stored
    const emotion = find_emotion(this.characters(), character_id, emotion_id);
    if (this.story_id() !== story_id || !emotion) {
      await this.assets.forget(image.asset_id);
      return false;
    }

    this.characters.update((characters) =>
      update_emotion(characters, character_id, emotion_id, (e) => ({
        ...e,
        image,
        ...placement_fields(default_placement),
      })),
    );
    await this.save_then_forget(emotion.image);
    return true;
  }

  // swaps a local picture for its Azure url, dropping the local copy only once that's saved
  async asset_uploaded(asset_id: string, url: string) {
    if (!images_of(this.characters()).some((image) => image.asset_id === asset_id)) {
      return;
    }
    this.characters.update((characters) => set_image_url(characters, asset_id, url));
    if (await this.save_now()) {
      await this.assets.forget(asset_id);
    }
  }

  // replaces the title, genres and description, e.g. with a saved story's when editing it
  set_metadata(metadata: StoryMetadata) {
    this.metadata.set({ ...metadata, genres: [...metadata.genres] });
  }

  // replaces the characters with ones from the backend, keeping pictures of any with the same names
  set_characters(characters: CharacterResponse[]) {
    this.characters.set(from_character_responses(characters, this.characters()));
  }

  // opens a saved story, using the backend's script, metadata and characters unless the local
  // draft is newer. the draft's genres and pictures are kept since the backend doesn't have them yet
  async open_saved_story(story_id: string, saved: SavedStory) {
    await this.open_story(story_id);
    // the draft has changes the backend doesn't, keep them
    if (this.draft_updated_at !== null && this.draft_updated_at > saved.updated_at) {
      return;
    }
    this.script.set(saved.script);
    this.set_metadata({ ...this.metadata(), ...saved.metadata });
    this.set_characters(saved.characters);
  }

  save_script_now(script: string) {
    this.script.set(script);
    return this.save_now();
  }

  // saves the draft straight away, replacing any save that was waiting
  save_now(): Promise<boolean> {
    this.cancel_save_later();
    const draft = this.draft();
    this.last_saved = draft;
    return save_draft({ ...draft, updated_at: Date.now() });
  }

  private save_later() {
    this.cancel_save_later();
    this.save_timer = setTimeout(() => void this.save_now(), SAVE_DELAY);
  }

  private cancel_save_later() {
    if (this.save_timer !== null) {
      clearTimeout(this.save_timer);
      this.save_timer = null;
    }
  }

  // applies a change that takes away an emotion's picture, then throws that picture away
  private change_emotion_and_forget_image(
    character_id: string,
    emotion_id: string,
    change: (characters: Character[]) => Character[],
  ) {
    const removed = find_emotion(this.characters(), character_id, emotion_id);
    this.characters.update(change);
    void this.save_then_forget(removed?.image);
  }

  // saves first so the draft never points at a deleted picture. if the save fails they're kept, restore() clears them later
  private async save_then_forget(...images: (AssetRef | null | undefined)[]) {
    if (await this.save_now()) {
      this.forget(...images);
    }
  }

  // throws away pictures, skipping missing ones. not waited for
  private forget(...images: (AssetRef | null | undefined)[]) {
    for (const image of images) {
      if (image) {
        void this.assets.forget(image.asset_id);
      }
    }
  }
}
