import { Component, inject, signal } from '@angular/core';
import { StoryService } from '../../services/story.service';

import { StoryDetails } from '../../../models/story-details';
import { StoryPreview } from '../../components/story-preview/story-preview';
import { Writer } from '../writer/writer';
import {
  RouterOutlet,
  RouterLink,
} from '../../../../node_modules/@angular/router/types/_router_module-chunk';
@Component({
  imports: [StoryPreview, Writer, RouterOutlet, RouterLink],
  selector: 'app-landing', //html tag for this component
  styleUrl: './landing.css',
  templateUrl: './landing.html',
})
export class Landing {
  protected stories = inject(StoryService).getStories();
  protected selectedStory = signal<StoryDetails | null>(null); // the story shown in the popup. this is null when it's closed
}
