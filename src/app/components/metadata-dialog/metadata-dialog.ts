import { afterNextRender, Component, ElementRef, input, output, viewChild } from '@angular/core';
import { StoryMetadata } from '../../../models/story-metadata';

@Component({
  selector: 'app-metadata-dialog',
  styleUrl: './metadata-dialog.css',
  templateUrl: './metadata-dialog.html',
})
export class MetadataDialog {
  metadata = input.required<StoryMetadata>(); // the current details, passed in by the writer
  saved = output<StoryMetadata>(); // sends the new details back when Save is pressed
  closed = output<void>(); // tells the writer the popup was closed (saved, cancelled or esc)

  protected dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog'); // popup

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal()); // open as soon as it's on the page
  }

  // turns what was typed into the boxes into metadata and sends it to the writer
  protected save(title: string, genres: string, description: string) {
    this.saved.emit({
      title: title.trim(),
      // genres are typed as "fantasy, mystery", split them into a list and drop empty ones
      genres: genres
        .split(',')
        .map((genre) => genre.trim())
        .filter((genre) => genre !== ''),
      description: description.trim(),
    });
    this.dialog().nativeElement.close();
  }
}
