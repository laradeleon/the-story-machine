// The Story Script JSON format (see docs/story-json.md).
// This is the contract between the scripting language (which produces it) and the reader (which plays it).

//info that isn't in the script itself, passed in by whoever calls toJSON
export interface StoryInfo {
  title: string;
  author: string;
  story_id: string;
}

export type Character = unknown; //todo later sprint

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
