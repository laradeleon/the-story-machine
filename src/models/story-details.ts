import { StoryInfo } from './story';

// information thats shown about a story when you click it on landing page
export interface StoryDetails extends StoryInfo {
  // story_id, title and author from parent
  author_id: string; // author's user id for the link to their profile
  description: string;
  updatedAt: string;
}
