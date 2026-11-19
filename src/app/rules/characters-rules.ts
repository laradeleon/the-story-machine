// the rules for characters and their emotions, with no Angular so they can be tested on their own
import { AssetRef } from '../../models/asset';
import { Character, Emotion } from '../../models/story';
import { default_placement, Placement } from './placement';

export function new_id(): string {
  return crypto.randomUUID();
}

export function name_key(name: string): string {
  return name.trim().toLowerCase();
}

// the name_keys that appear more than once
export function duplicated_keys(names: string[]): Set<string> {
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

// the first free name, e.g. "Character 2" when "Character 1" and "Character 3" exist
export function next_name(prefix: string, existing: string[]): string {
  const taken = new Set(existing.map(name_key));
  let number = 1;
  while (taken.has(name_key(`${prefix} ${number}`))) {
    number++;
  }
  return `${prefix} ${number}`;
}

// an emotion's portrait_x, portrait_y and zoom as the image editor's placement
export function placement_of(emotion?: Emotion): Placement {
  if (!emotion) {
    return { ...default_placement };
  }
  return { x: emotion.portrait_x, y: emotion.portrait_y, zoom: emotion.zoom };
}

export function placement_fields(placement: Placement) {
  return { portrait_x: placement.x, portrait_y: placement.y, zoom: placement.zoom };
}

// a new character called "Character 1", "Character 2", ...
export function new_character(characters: Character[]): Character {
  return {
    id: new_id(),
    name: next_name(
      'Character',
      characters.map((c) => c.name),
    ),
    description: '',
    emotions: [],
  };
}

// a new emotion called "Emotion 1", "Emotion 2", ... with no picture
export function new_emotion(emotions: Emotion[]): Emotion {
  return {
    id: new_id(),
    emotion: next_name(
      'Emotion',
      emotions.map((e) => e.emotion),
    ),
    image: null,
    ...placement_fields(default_placement),
  };
}

// ---- changes: each gives back a new list so signals notice, an unknown id changes nothing

export function update_character(
  characters: Character[],
  id: string,
  change: (character: Character) => Character,
): Character[] {
  return characters.map((c) => (c.id === id ? change(c) : c));
}

// changes one emotion of one character
export function update_emotion(
  characters: Character[],
  character_id: string,
  emotion_id: string,
  change: (emotion: Emotion) => Emotion,
): Character[] {
  return update_character(characters, character_id, (character) => ({
    ...character,
    emotions: character.emotions.map((e) => (e.id === emotion_id ? change(e) : e)),
  }));
}

export function remove_character(characters: Character[], id: string): Character[] {
  return characters.filter((c) => c.id !== id);
}

// takes an emotion out of a character
export function remove_emotion(
  characters: Character[],
  character_id: string,
  emotion_id: string,
): Character[] {
  return update_character(characters, character_id, (character) => ({
    ...character,
    emotions: character.emotions.filter((e) => e.id !== emotion_id),
  }));
}

// gives the picture its Azure url wherever it's used
export function set_image_url(characters: Character[], asset_id: string, url: string): Character[] {
  return characters.map((character) => ({
    ...character,
    emotions: character.emotions.map((e) =>
      e.image?.asset_id === asset_id ? { ...e, image: { asset_id, url } } : e,
    ),
  }));
}

// ---- reading the list

export function find_emotion(
  characters: Character[],
  character_id: string,
  emotion_id: string,
): Emotion | null {
  const character = characters.find((c) => c.id === character_id);
  return character?.emotions.find((e) => e.id === emotion_id) ?? null;
}

// every picture the characters use
export function images_of(characters: Character[]): AssetRef[] {
  return characters.flatMap((character) =>
    character.emotions.flatMap((emotion) => (emotion.image ? [emotion.image] : [])),
  );
}

// the problems that stop the popup closing (duplicate_names can be passed in if already known)
export function character_problems(
  characters: Character[],
  duplicate_names: ReadonlySet<string> = duplicated_keys(characters.map((c) => c.name)),
): string[] {
  const messages: string[] = [];

  if (characters.some((character) => name_key(character.name) === '')) {
    messages.push('A character has no name.');
  }
  if (duplicate_names.size > 0) {
    messages.push('Two or more characters share a name.');
  }
  if (
    characters.some((character) => {
      const names = character.emotions.map((emotion) => emotion.emotion);
      return names.some((name) => name_key(name) === '') || duplicated_keys(names).size > 0;
    })
  ) {
    messages.push('An emotion has no name, or a character has two emotions with the same name.');
  }
  return messages;
}

// TODO: return the characters the lexer won't allow in an emotion name, once that rule is decided
export function unapproved_characters(name: string): string[] {
  void name;
  return [];
}
