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
  title: string;
  description: string;
  updatedAt: string;
}

export interface UserResponse {
  _id: string;
  username: string;
  displayName: string;
}

export interface ChapterResponse {
  _id: string;
  title: string;
  order: number;
  contents: StoryJSON | null;
}
