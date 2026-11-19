import { Component, computed, inject, output, signal, viewChild } from '@angular/core';
import { ModalDialog } from '../../directives/modal-dialog';
import { Character, Emotion } from '../../../models/story';
import { AssetService } from '../../services/asset.service';
import { ImageService } from '../../services/image.service';
import { WriterStateService } from '../../services/writer-state.service';
import { ImageEditor } from '../image-editor/image-editor';
import { Placement } from '../../rules/placement';
import { ImageThumbnail } from '../image-thumbnail/image-thumbnail';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';
import {
  character_problems,
  duplicated_keys,
  name_key,
  new_character,
  new_emotion,
  placement_fields,
  placement_of,
  update_character,
  update_emotion,
} from '../../rules/characters-rules';

// the popup opened by the Characters button. three columns: the character list, the selected
// character's details and emotions, and the selected emotion's picture.
// this only handles what's on screen (the selection, messages and confirm popups). the rules and the
// changes to the list are in characters-rules.ts, and the characters live in WriterStateService, which
// also handles changes that affect the pictures (storing, saving and throwing them away)
@Component({
  imports: [ModalDialog, ImageEditor, ImageThumbnail, ConfirmDialog],
  selector: 'app-characters-dialog',
  styleUrl: './characters-dialog.css',
  templateUrl: './characters-dialog.html',
})
export class CharactersDialog {
  closed = output<void>(); // tells the writer the popup was closed (Close, Esc, or after a valid close)

  protected state = inject(WriterStateService); // holds the characters the writer has made so far
  private images = inject(ImageService); // checks and prepares the uploaded picture files
  private assets = inject(AssetService); // stores the pictures and says where to show them from

  private modal = viewChild.required(ModalDialog); // the popup, opened by the appModal directive

  // the name rule, so the template can compare names the same way the rules do
  protected readonly name_key = name_key;
  // the placement the image editor and thumbnails show for an emotion
  protected readonly to_placement = placement_of;

  error = signal<string | null>(null); // a message for the writer, null when there isn't one
  selected_character_id = signal<string | null>(null); // the character shown in the middle column
  selected_emotion_id = signal<string | null>(null); // the emotion shown on the right
  outline_visible = signal(true); // whether the see-through person guide is drawn over the picture
  confirm_character_open = signal(false); // whether the "delete this character?" popup is showing
  confirm_emotion_open = signal(false); // whether the "delete this emotion?" popup is showing

  selected_character = computed(
    () => this.state.characters().find((c) => c.id === this.selected_character_id()) ?? null,
  );
  selected_emotion = computed(
    () =>
      this.selected_character()?.emotions.find((e) => e.id === this.selected_emotion_id()) ?? null,
  );

  // names used by more than one character
  duplicate_character_names = computed(() =>
    duplicated_keys(this.state.characters().map((character) => character.name)),
  );

  // emotion names used by more than one emotion in the selected character
  duplicate_emotion_keys = computed(() =>
    duplicated_keys(this.selected_character()?.emotions.map((e) => e.emotion) ?? []),
  );

  // the things still wrong that stop the popup closing, shown as messages above the columns
  problems = computed(() => character_problems(this.state.characters()));

  has_problems = computed(() => this.problems().length > 0);

  // adds a character called "Character 1", "Character 2", ... and selects it
  add_character() {
    this.error.set(null);
    const character = new_character(this.state.characters());
    this.state.characters.update((list) => [...list, character]);
    this.select_character(character.id);
  }

  // changes a character's name. duplicates are allowed here, the popup just won't close yet
  rename_character(id: string, name: string) {
    this.error.set(null);
    this.change_character(id, (character) => ({ ...character, name }));
  }

  // changes a character's description
  set_description(id: string, description: string) {
    this.error.set(null);
    this.change_character(id, (character) => ({ ...character, description }));
  }

  // removes a character and everything in it, pictures included
  remove_character(id: string) {
    this.error.set(null);
    this.state.remove_character(id);
    if (this.selected_character_id() === id) {
      this.select_character(null);
    }
  }

  // removes the selected character, once the user has confirmed it
  remove_selected_character() {
    const id = this.selected_character_id();
    if (id) {
      this.remove_character(id);
    }
  }

  // removes the selected emotion, and its picture, once the user has confirmed it
  remove_selected_emotion() {
    this.error.set(null);
    const character = this.selected_character();
    const emotion = this.selected_emotion();
    if (!character || !emotion) {
      return;
    }
    this.state.remove_emotion(character.id, emotion.id);
    this.selected_emotion_id.set(null);
  }

  // shows a character in the middle and right columns (null clears the selection)
  select_character(id: string | null) {
    this.error.set(null);
    this.selected_character_id.set(id);
    this.selected_emotion_id.set(null);
  }

  // adds an emotion called "Emotion 1", "Emotion 2", ... to the selected character and selects it
  add_emotion() {
    this.error.set(null);
    const character = this.selected_character();
    if (!character) {
      this.error.set('Select or add a character first.');
      return;
    }

    const emotion = new_emotion(character.emotions);
    this.change_character(character.id, (c) => ({ ...c, emotions: [...c.emotions, emotion] }));
    this.selected_emotion_id.set(emotion.id);
  }

  // changes an emotion's name. duplicates are allowed here, the popup just won't close yet
  rename_emotion(id: string, name: string) {
    this.error.set(null);
    const character = this.selected_character();
    if (!character) {
      return;
    }
    this.state.characters.update((characters) =>
      update_emotion(characters, character.id, id, (e) => ({ ...e, emotion: name })),
    );
  }

  // shows an emotion's picture on the right
  select_emotion(id: string) {
    this.error.set(null);
    this.selected_emotion_id.set(id);
  }

  // where to show an emotion's picture from (its Azure url, or the local copy until it's uploaded)
  image_url_of(emotion?: Emotion): string | null {
    return this.assets.url_of(emotion?.image);
  }

  // puts a picture on the selected emotion. the file is checked and converted first, so this waits.
  // returns false (and sets the error) if it can't be used
  async set_image_from_file(file: File | null): Promise<boolean> {
    this.error.set(null);
    const character = this.selected_character();
    const emotion = this.selected_emotion();
    if (!character || !emotion) {
      this.error.set('Select an emotion first.');
      return false;
    }
    if (!file) {
      return false;
    }

    // keep the ids from before converting, the selection (or even the open story) may change meanwhile
    const story_id = this.state.story_id();
    let picture: Blob;
    try {
      picture = await this.images.prepare_image(file);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not read the image.');
      return false;
    }
    return this.state.set_emotion_image(story_id, character.id, emotion.id, picture);
  }

  // the image editor moved, zoomed or was typed into: stores the new placement on the selected emotion
  set_placement(placement: Placement) {
    this.update_selected_emotion((e) => ({ ...e, ...placement_fields(placement) }));
  }

  // removes the selected emotion's picture. the emotion stays in the list
  delete_image() {
    this.error.set(null);
    const character = this.selected_character();
    const emotion = this.selected_emotion();
    if (!character || !emotion) {
      return;
    }
    this.state.remove_emotion_image(character.id, emotion.id);
  }

  // the message shown in red under the picture when something is wrong with it, or null if it's fine
  image_problem(emotion: Emotion): string | null {
    if (this.assets.is_unsaved(emotion.image)) {
      return "This picture couldn't be saved on this device (it may be full), so it will be gone after a reload.";
    }
    if (emotion.image && !this.assets.url_of(emotion.image)) {
      return 'This picture could not be found. Please add it again.';
    }
    return null;
  }

  // Esc closes the popup, so stop it while the characters have problems
  on_cancel(event: Event) {
    if (this.has_problems()) {
      event.preventDefault();
      this.show_problem();
    }
  }

  // the Close button. only closes when there are no problems
  close() {
    if (this.has_problems()) {
      this.show_problem();
      return;
    }
    this.modal().close();
  }

  // changes the selected emotion, if there is one
  private update_selected_emotion(change: (emotion: Emotion) => Emotion) {
    const character = this.selected_character();
    const emotion = this.selected_emotion();
    if (!character || !emotion) {
      return;
    }
    this.state.characters.update((characters) =>
      update_emotion(characters, character.id, emotion.id, change),
    );
  }

  // changes one character
  private change_character(id: string, change: (character: Character) => Character) {
    this.state.characters.update((characters) => update_character(characters, id, change));
  }

  private show_problem() {
    this.error.set('Fix the problems above before closing.');
  }
}
