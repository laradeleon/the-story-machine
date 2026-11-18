import { Component, input } from '@angular/core';
import { default_placement, Placement, placement_style } from '../image-editor/placement';

// a small square picture, placed the same way as in the image editor so it matches what was set there.
// the empty square uses --thumbnail-bg, which a popup can set to a darker shade
@Component({
  selector: 'app-image-thumbnail',
  styleUrl: './image-thumbnail.css',
  templateUrl: './image-thumbnail.html',
})
export class ImageThumbnail {
  image_url = input<string | null>(null); // the picture to show, null when there isn't one
  placement = input<Placement | null>(null); // where the picture sits, only given once a picture has been placed

  // the CSS that places the picture inside the square
  picture_style(): string {
    return placement_style(this.placement() ?? default_placement);
  }
}
