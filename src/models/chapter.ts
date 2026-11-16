import { Line } from './story';

// reader will play one chapter at a time
export interface Chapter {
  title: string;
  lines: Line[];
  hasNextChapter?: boolean; // if the story has another chapter after the current one
}
