import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StoryService } from '../../services/story.service';
import { ReadingProgressService } from '../../services/reading-progress.service';

import { StoryDetails } from '../../../models/story-details';
import { StoryPreview } from '../../components/story-preview/story-preview';
import { AccountMenu } from '../../components/account-menu/account-menu';
import { StoryCard } from '../../components/story-card/story-card';

@Component({
  imports: [StoryPreview, RouterLink, AccountMenu, StoryCard],
  selector: 'app-landing', //html tag for this component
  styleUrl: './landing.css',
  templateUrl: './landing.html',
})
export class Landing {
  protected stories = inject(StoryService).getStories();
  protected selectedStory = signal<StoryDetails | null>(null); // the story shown in the popup. this is null when it's closed
  private progress = inject(ReadingProgressService);

  // stories this reader started but hasnt finished, with the chapter they're on, for the continue reading list
  // most recently read first
  protected inProgressStories = computed(() => {
    if (!this.stories.hasValue()) {
      return []; // still loading or failed to load, so there's nothing to match the progress against yet
    }
    // look up stories by id, so the list can follow the progress order instead of the story list's order
    const storiesById = new Map(this.stories.value().map((story) => [story.story_id, story]));

    const items: { story: StoryDetails; chapter: number }[] = [];
    for (const storyId of this.progress.inProgressStoryIds()) {
      const story = storiesById.get(storyId);
      if (!story) {
        continue; // they have progress for it but it was deleted or unpublished so leave it out
      }
      items.push({
        story,
        chapter: (this.progress.get(storyId)?.chapterIndex ?? 0) + 1, // prevent chapter 0 from showing, as chapterIndex starts at 0
      });
    }
    return items;
  });
}
