import { CharacterResponse } from './api';
import { StoryMetadata } from './story-metadata';

// what the backend has saved for a story, put in the writer when editing it
export interface SavedStory {
  script: string;
  metadata: Pick<StoryMetadata, 'title' | 'description'>; // the backend has no genres yet
  characters: CharacterResponse[];
  updated_at: number; // when the backend copy last changed, in ms since 1970 like a draft's
}
