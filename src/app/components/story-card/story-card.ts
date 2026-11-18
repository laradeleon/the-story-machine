import { Component, input } from '@angular/core';
import { StoryDetails } from '../../../models/story-details';

/**
 * StoryCard
 *
 * One story shown as a book shaped card with its title and author.
 * - used on the landing page and on profile pages

 */
@Component({
  selector: 'app-story-card',
  styleUrl: './story-card.css',
  templateUrl: './story-card.html',
})
export class StoryCard {
  story = input.required<StoryDetails>();
}
