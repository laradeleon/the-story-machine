// The Story Script JSON format (see docs/story-json.md).
// This is the contract between the scripting language (which produces it) and the reader (which plays it).

//info that isn't in the script itself, passed in by whoever calls toJSON
export interface StoryInfo {
  title: string;
  author: string;
  story_id: string;
}

// one picture of a character, shown when a line uses this emotion as its emotion
export interface Emotion {
  id: string; // unique key, so the emotion can be renamed without losing its place in the list
  emotion: string; // the word the author types to pick this portrait, e.g. "happy"
  image_url: string | null; // where the portrait image is (a data URL for now), null until one is uploaded
  portrait_x: number; // how far the portrait is moved sideways, as a % of the upload area (0 = centred)
  portrait_y: number; // how far the portrait is moved down, as a % of the upload area (0 = centred)
  zoom: number; // how big the portrait is, as a % (100 = fits the upload area)
}

// a character the author defined in the editor
export interface Character {
  id: string; // unique key, used to refer to the character
  name: string; // the name shown in dialogue
  description: string; // free-text description the author writes about the character (can be empty)
  emotions: Emotion[]; // every portrait this character has
}

export interface Text {
  words: string[];
}

export interface ChoiceOption {
  goto_line: number;
  option_body: string;
  condition: null;
}

//What any single entry in story lines looks like
export type Line =
  | { line_id: number; prose: { text: Text; text_color: null } }
  | { line_id: number; dialogue: { name: string; portrait: string; text: Text; text_color: null } }
  | { line_id: number; choice: ChoiceOption[] }
  | { line_id: number; background: string }
  | { line_id: number; goto_line: number }
  | { line_id: number; end: true };

export interface StoryJSON extends StoryInfo {
  characters: Record<string, Character>;
  story: {
    flags: Record<string, { line_id: number }>;
    variables: [];
    lines: Line[];
  };
}
