import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StoryService } from '../../services/story.service';

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
}
