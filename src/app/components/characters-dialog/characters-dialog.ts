import { Component, computed, inject, output, signal, viewChild } from '@angular/core';
import { ModalDialog } from '../../directives/modal-dialog';
import { Character, Emotion } from '../../../models/story';
import { ImageService } from '../../services/image.service';
import { WriterStateService } from '../../services/writer-state.service';
import { ImageEditor } from '../image-editor/image-editor';
import { default_placement, Placement } from '../image-editor/placement';
import { ImageThumbnail } from '../image-thumbnail/image-thumbnail';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';

// a new id that doesn't depend on the name, so things can share a name (the popup won't close until they're renamed)
function new_id(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// names are compared ignoring capitals and spaces at the ends
function name_key(name: string): string {
  return name.trim().toLowerCase();
}

// the names that appear more than once in a list (compared with name_key)
function duplicated_keys(names: string[]): Set<string> {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const name of names) {
    const key = name_key(name);
    if (seen.has(key)) {
      duplicates.add(key);
    }
    seen.add(key);
  }
  return duplicates;
}

// the first free name in a list, such as "Character 2" when "Character 1" and "Character 3" exist
function next_name(prefix: string, existing: string[]): string {
  const taken = new Set(existing.map(name_key));
  let number = 1;
  while (taken.has(name_key(`${prefix} ${number}`))) {
    number++;
  }
  return `${prefix} ${number}`;
}

// an emotion stores its placement as portrait_x, portrait_y and zoom (see docs/story-json.md),
// the image editor works with x, y and zoom. these two convert between them
function placement_of(emotion?: Emotion): Placement {
  if (!emotion) {
    return { ...default_placement };
  }
  return { x: emotion.portrait_x, y: emotion.portrait_y, zoom: emotion.zoom };
}

function placement_fields(placement: Placement) {
  return { portrait_x: placement.x, portrait_y: placement.y, zoom: placement.zoom };
}

// TODO: the script can only refer to emotions by words it understands, so an emotion name should
// only use the characters the lexer allows. the rule isn't decided yet, so nothing checks it.
// once it is, this returns the characters in the name that aren't allowed
export function unapproved_characters(name: string): string[] {
  void name;
  return [];
}

// the popup opened by the Characters button. three columns: the character list, the selected
// character's details and emotions, and the selected emotion's portrait. the writer's characters
// live in WriterStateService, so anything changed here is kept while the writer is open
@Component({
  imports: [ModalDialog, ImageEditor, ImageThumbnail, ConfirmDialog],
  selector: 'app-characters-dialog',
  styleUrl: './characters-dialog.css',
  templateUrl: './characters-dialog.html',
})
export class CharactersDialog {
  closed = output<void>(); // tells the writer the popup was closed (Close, Esc, or after a valid close)

  protected state = inject(WriterStateService); // holds the characters the writer has made so far
  private images = inject(ImageService); // checks and reads the uploaded portrait files

  private modal = viewChild.required(ModalDialog); // the popup, opened by the appModal directive

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
    duplicated_keys(this.selected_character()?.emotions.map((e) => e.keyword) ?? []),
  );

  // the things still wrong that stop the popup closing, shown as messages above the columns
  problems = computed(() => {
    const messages: string[] = [];
    const characters = this.state.characters();

    if (characters.some((character) => name_key(character.name) === '')) {
      messages.push('A character has no name.');
    }
    if (this.duplicate_character_names().size > 0) {
      messages.push('Two or more characters share a name.');
    }
    if (
      characters.some((character) => {
        const names = character.emotions.map((emotion) => emotion.keyword);
        return names.some((name) => name_key(name) === '') || duplicated_keys(names).size > 0;
      })
    ) {
      messages.push('An emotion has no name, or a character has two emotions with the same name.');
    }
    return messages;
  });

  has_problems = computed(() => this.problems().length > 0);

  // adds a character called "Character 1", "Character 2", ... and selects it
  add_character() {
    this.error.set(null);
    const id = new_id();
    const name = next_name(
      'Character',
      this.state.characters().map((c) => c.name),
    );
    this.state.characters.update((list) => [...list, { id, name, description: '', emotions: [] }]);
    this.select_character(id);
  }

  // changes a character's name. duplicates are allowed here, the popup just won't close yet
  rename_character(id: string, name: string) {
    this.error.set(null);
    this.update_character(id, (character) => ({ ...character, name }));
  }

  // changes a character's description
  set_description(id: string, description: string) {
    this.error.set(null);
    this.update_character(id, (character) => ({ ...character, description }));
  }

  // removes a character and everything in it
  remove_character(id: string) {
    this.error.set(null);
    this.state.characters.update((list) => list.filter((character) => character.id !== id));
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

  // removes the selected emotion, and its portrait, once the user has confirmed it
  remove_selected_emotion() {
    this.error.set(null);
    const character = this.selected_character();
    const emotion = this.selected_emotion();
    if (!character || !emotion) {
      return;
    }
    this.update_character(character.id, (c) => ({
      ...c,
      emotions: c.emotions.filter((e) => e.id !== emotion.id),
    }));
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

    const id = new_id();
    const keyword = next_name(
      'Emotion',
      character.emotions.map((e) => e.keyword),
    );
    this.update_character(character.id, (c) => ({
      ...c,
      emotions: [
        ...c.emotions,
        { id, keyword, image_url: null, ...placement_fields(default_placement) },
      ],
    }));
    this.selected_emotion_id.set(id);
  }

  // changes an emotion's name. duplicates are allowed here, the popup just won't close yet
  rename_emotion(id: string, keyword: string) {
    this.error.set(null);
    const character = this.selected_character();
    if (!character) {
      return;
    }
    this.update_emotion(character.id, id, (emotion) => ({ ...emotion, keyword }));
  }

  // shows an emotion's portrait on the right
  select_emotion(id: string) {
    this.error.set(null);
    this.selected_emotion_id.set(id);
  }

  // the placement the image editor and thumbnails show for an emotion
  to_placement(emotion?: Emotion): Placement {
    return placement_of(emotion);
  }

  // puts an image on the selected emotion. the file is checked and read first, so this waits.
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

    // keep the ids from before reading, the selection may change while the file is read
    const character_id = character.id;
    const emotion_id = emotion.id;
    let image_url: string;
    try {
      image_url = await this.images.read_image(file);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not read the image.');
      return false;
    }

    // a new portrait starts centred at 100%, so the old position doesn't carry over
    this.update_emotion(character_id, emotion_id, (e) => ({
      ...e,
      image_url,
      ...placement_fields(default_placement),
    }));
    return true;
  }

  // the image editor moved, zoomed or was typed into: stores the new placement on the selected emotion
  set_placement(placement: Placement) {
    this.update_selected_emotion((e) => ({ ...e, ...placement_fields(placement) }));
  }

  // removes the selected emotion's portrait. the emotion stays in the list
  delete_image() {
    this.error.set(null);
    const character = this.selected_character();
    const emotion = this.selected_emotion();
    if (!character || !emotion) {
      return;
    }
    this.update_emotion(character.id, emotion.id, (e) => ({ ...e, image_url: null }));
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
    this.update_emotion(character.id, emotion.id, change);
  }

  private show_problem() {
    this.error.set('Fix the problems above before closing.');
  }

  private update_character(id: string, change: (character: Character) => Character) {
    this.state.characters.update((list) => list.map((c) => (c.id === id ? change(c) : c)));
  }

  private update_emotion(
    character_id: string,
    emotion_id: string,
    change: (emotion: Emotion) => Emotion,
  ) {
    this.update_character(character_id, (character) => ({
      ...character,
      emotions: character.emotions.map((e) => (e.id === emotion_id ? change(e) : e)),
    }));
  }
}
