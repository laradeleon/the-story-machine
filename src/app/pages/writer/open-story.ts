import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { WriterStateService } from '../../services/writer-state.service';

// opens the story in the url (/write/:storyId) before the writer page and its editor are made.
// the route always has a storyId, so it's never null
export const open_story_from_url: ResolveFn<void> = (route) =>
  inject(WriterStateService).open_story(route.paramMap.get('storyId')!);
