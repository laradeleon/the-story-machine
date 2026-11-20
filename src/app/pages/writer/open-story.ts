import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { PLACEHOLDER_STORY_ID, WriterStateService } from '../../services/writer-state.service';

// opens the story in the url (/write/:storyId) before the writer page and its editor are made
export const open_story_from_url: ResolveFn<void> = (route) =>
  inject(WriterStateService).open_story(route.paramMap.get('storyId') ?? PLACEHOLDER_STORY_ID);
