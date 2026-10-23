import { StoryInfo } from './story';

// information thats shown about a story when you click it on landing page
export interface StoryDetails extends StoryInfo {
  // story_id, title and author from parent
  description: string;
  updatedAt: string;
}
