import {
  Component,
  computed,
  inject,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
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

// the Characters popup: the character list, the selected character, and the selected emotion's picture
@Component({
  imports: [ModalDialog, ImageEditor, ImageThumbnail, ConfirmDialog],
  selector: 'app-characters-dialog',
  styleUrl: './characters-dialog.css',
  templateUrl: './characters-dialog.html',
})
export class CharactersDialog {
  closed = output<void>();

  protected state = inject(WriterStateService);
  private images = inject(ImageService);
  private assets = inject(AssetService);

  private modal = viewChild.required(ModalDialog);

  protected readonly name_key = name_key;

  selected_character_id = signal<string | null>(null);
  selected_emotion_id = signal<string | null>(null);
  outline_visible = signal(true); // the see-through person guide over the picture
  confirming = signal<'character' | 'emotion' | null>(null); // which delete popup is showing

  // cleared whenever the characters or the selection change
  error = linkedSignal({
    source: () => [
      this.state.characters(),
      this.selected_character_id(),
      this.selected_emotion_id(),
    ],
    computation: (): string | null => null,
  });

  selected_character = computed(
    () => this.state.characters().find((c) => c.id === this.selected_character_id()) ?? null,
  );
  selected_emotion = computed(
    () =>
      this.selected_character()?.emotions.find((e) => e.id === this.selected_emotion_id()) ?? null,
  );
  // null unless both a character and an emotion are selected
  private selected_ids = computed(() => {
    const character = this.selected_character();
    const emotion = this.selected_emotion();
    return character && emotion ? { character_id: character.id, emotion_id: emotion.id } : null;
  });
  selected_placement = computed(() => placement_of(this.selected_emotion() ?? undefined));

  duplicate_character_names = computed(() =>
    duplicated_keys(this.state.characters().map((character) => character.name)),
  );

  // duplicate emotion names in the selected character
  duplicate_emotion_keys = computed(() =>
    duplicated_keys(this.selected_character()?.emotions.map((e) => e.emotion) ?? []),
  );

  problems = computed(() =>
    character_problems(this.state.characters(), this.duplicate_character_names()),
  );

  has_problems = computed(() => this.problems().length > 0);

  // adds "Character N" and selects it
  add_character() {
    const character = new_character(this.state.characters());
    this.state.characters.update((list) => [...list, character]);
    this.select_character(character.id);
  }

  rename_character(id: string, name: string) {
    this.change_character(id, (character) => ({ ...character, name }));
  }

  set_description(id: string, description: string) {
    this.change_character(id, (character) => ({ ...character, description }));
  }

  // removes the selected character and its pictures, once confirmed
  remove_selected_character() {
    const id = this.selected_character_id();
    if (id) {
      this.state.remove_character(id);
      this.select_character(null);
    }
  }

  // removes the selected emotion and its picture, once confirmed
  remove_selected_emotion() {
    const ids = this.selected_ids();
    if (ids) {
      this.state.remove_emotion(ids.character_id, ids.emotion_id);
      this.selected_emotion_id.set(null);
    }
  }

  // selects a character (null clears the selection) and clears the emotion
  select_character(id: string | null) {
    this.selected_character_id.set(id);
    this.selected_emotion_id.set(null);
  }

  // adds "Emotion N" to the selected character and selects it
  add_emotion() {
    const character = this.selected_character();
    if (!character) {
      return;
    }

    const emotion = new_emotion(character.emotions);
    this.change_character(character.id, (c) => ({ ...c, emotions: [...c.emotions, emotion] }));
    this.selected_emotion_id.set(emotion.id);
  }

  rename_emotion(name: string) {
    this.update_selected_emotion((e) => ({ ...e, emotion: name }));
  }

  select_emotion(id: string) {
    this.selected_emotion_id.set(id);
  }

  image_url_of(emotion?: Emotion): string | null {
    return this.assets.url_of(emotion?.image);
  }

  // converts the file and puts it on the selected emotion, giving back false if it can't
  async set_image_from_file(file: File | null): Promise<boolean> {
    const ids = this.selected_ids();
    if (!ids || !file) {
      return false;
    }

    // read before converting, the open story may change meanwhile
    const story_id = this.state.story_id();
    let picture: Blob;
    try {
      picture = await this.images.prepare_image(file);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not read the image.');
      return false;
    }
    return this.state.set_emotion_image(story_id, ids.character_id, ids.emotion_id, picture);
  }

  set_placement(placement: Placement) {
    this.update_selected_emotion((e) => ({ ...e, ...placement_fields(placement) }));
  }

  // removes the selected emotion's picture, keeping the emotion
  delete_image() {
    const ids = this.selected_ids();
    if (ids) {
      this.state.remove_emotion_image(ids.character_id, ids.emotion_id);
    }
  }

  // the message shown under a picture that wasn't saved or can't be found, otherwise null
  image_problem(emotion: Emotion): string | null {
    if (this.assets.is_unsaved(emotion.image)) {
      return "This picture couldn't be saved on this device (it may be full), so it will be gone after a reload.";
    }
    if (emotion.image && !this.assets.url_of(emotion.image)) {
      return 'This picture could not be found. Please add it again.';
    }
    return null;
  }

  // stops Esc closing the popup while there are problems
  on_cancel(event: Event) {
    if (this.has_problems()) {
      event.preventDefault();
      this.show_problem();
    }
  }

  // closes the popup unless there are problems
  close() {
    if (this.has_problems()) {
      this.show_problem();
      return;
    }
    this.modal().close();
  }

  // changes the selected emotion, if there is one
  private update_selected_emotion(change: (emotion: Emotion) => Emotion) {
    const ids = this.selected_ids();
    if (ids) {
      this.state.characters.update((characters) =>
        update_emotion(characters, ids.character_id, ids.emotion_id, change),
      );
    }
  }

  private change_character(id: string, change: (character: Character) => Character) {
    this.state.characters.update((characters) => update_character(characters, id, change));
  }

  private show_problem() {
    this.error.set('Fix the problems above before closing.');
  }
}
