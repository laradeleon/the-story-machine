import { StoryJSON } from './story';

// structure of responses from backend

export interface APIResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface StoryResponse {
  _id: string;
  authorId: string;
  author: { displayName: string }; // the author's public name
  title: string;
  description: string;
  updatedAt: string;
}

// this is for one chapter in the list from GET /story/:storyId/chapter (but no script)
export interface ChapterSummaryResponse {
  title: string; // the STORY title
  author: string;
  story_id: string;
  chapter_id: string;
  chapter_name: string; // CHAPTER title
}

// one chapter from GET /story/:storyId/chapter/:id, which includes its script
export interface ChapterResponse extends ChapterSummaryResponse {
  characters: StoryJSON['characters'];
  story: StoryJSON['story']; // would have no lines until the author saves a script
}

// structure of requests to backend

// one emotion in PATCH /story/:id. only the name until the backend has emotions,
// then it gets portrait_x, portrait_y, zoom and the picture's url
export interface EmotionRequest {
  emotion: string;
}

// one character in PATCH /story/:id, the backend finds characters by name so there's no id
export interface CharacterRequest {
  name: string;
  description: string | null;
  emotions: EmotionRequest[];
}
