import { StoryMetadata } from './story-metadata';
import { Character } from './story';

// everything the writer has done on one story, saved in the browser's IndexedDB under its story_id.
// kept as one object so the script, metadata and characters are always saved together
export interface Draft {
  story_id: string; // which story this is. the key the draft is saved under
  script: string | null; // the editor text, null until the writer has typed anything
  metadata: StoryMetadata; // from the metadata popup
  characters: Character[]; // from the characters popup, portraits included
  updated_at: number; // when it was last saved, in ms since 1970 (from Date.now())
}
