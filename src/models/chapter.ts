import { Line } from './story';

// reader will play one chapter at a time
export interface Chapter {
  title: string;
  lines: Line[];
}
