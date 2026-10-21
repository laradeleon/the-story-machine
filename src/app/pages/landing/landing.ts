import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StoryService } from '../../services/story.service';
@Component({
  imports: [RouterLink],
  selector: 'app-landing', //html tag for this component
  styleUrl: './landing.css',
  templateUrl: './landing.html',
})
export class Landing {
  protected stories = inject(StoryService).getStories();
}
