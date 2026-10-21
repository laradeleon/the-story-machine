import { Component, input, output, viewChild, ElementRef } from '@angular/core';
import { StoryDetails } from '../../../models/story-details';
import { DatePipe } from '@angular/common';
import { afterNextRender } from '@angular/core';

@Component({
  imports: [DatePipe],
  selector: 'app-story-preview',
  styleUrl: './story-preview.css',
  templateUrl: './story-preview.html',
})
export class StoryPreview {
  story = input.required<StoryDetails>(); // passed in by landing page
  closed = output<void>(); // tells landing page it was closed

  private dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog'); // popup

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal()); // show popup only if dialog element exists
  }

  protected closeOnBackdropClick(event: MouseEvent) {
    // only closes if the click was on the background and not the content of the popup
    if (event.target === this.dialog().nativeElement) {
      this.dialog().nativeElement.close();
    }
  }
}
