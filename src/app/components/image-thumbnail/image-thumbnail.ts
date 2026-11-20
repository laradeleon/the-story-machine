import { Component, computed, input } from '@angular/core';
import { Emotion } from '../../../models/story';
import { placement_of } from '../../rules/characters-rules';
import { placement_style } from '../../rules/placement';

// a small square picture, placed the same way as in the image editor
@Component({
  selector: 'app-image-thumbnail',
  styleUrl: './image-thumbnail.css',
  templateUrl: './image-thumbnail.html',
})
export class ImageThumbnail {
  image_url = input<string | null>(null);
  emotion = input<Emotion | undefined>(undefined); // undefined is centred at 100%

  protected picture_style = computed(() => placement_style(placement_of(this.emotion())));
}
