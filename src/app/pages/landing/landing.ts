import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { StoryService } from '../../services/story.service';
import { ReadingProgressService } from '../../services/reading-progress.service';
import { AuthService } from '../../services/auth.service';
import { api_reason } from '../../services/api-errors';

import { StoryDetails } from '../../../models/story-details';
import { StoryPreview } from '../../components/story-preview/story-preview';
import { AccountMenu } from '../../components/account-menu/account-menu';
import { StoryCard } from '../../components/story-card/story-card';

// the backend needs a title to create a story, the writer replaces it from the metadata popup
export const NEW_STORY_TITLE = 'Untitled story';

@Component({
  imports: [StoryPreview, RouterLink, AccountMenu, StoryCard],
  selector: 'app-landing', //html tag for this component
  styleUrl: './landing.css',
  templateUrl: './landing.html',
})
export class Landing {
  private storyService = inject(StoryService);
  private router = inject(Router);
  protected stories = this.storyService.getStories();
  protected selectedStory = signal<StoryDetails | null>(null); // the story shown in the popup. this is null when it's closed
  private progress = inject(ReadingProgressService);
  protected isSignedIn = inject(AuthService).isSignedIn; // guests have to sign in before writing

  protected creating = signal(false); // while the new story is being made on the backend
  protected createError = signal<string | null>(null); // why the last new story couldn't be made

  // makes a new story on the backend and opens it in the writer
  protected async write_story() {
    this.creating.set(true);
    this.createError.set(null);
    try {
      const story = await this.storyService.create_story(NEW_STORY_TITLE, '');
      await this.router.navigate(['/write', story._id]);
    } catch (error) {
      this.createError.set(`A new story couldn't be started. ${api_reason(error)}`);
    } finally {
      this.creating.set(false);
    }
  }

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
