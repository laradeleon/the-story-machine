import { Component, computed, inject, input, output, viewChild, ElementRef } from '@angular/core';
import { StoryDetails } from '../../../models/story-details';
import { DatePipe } from '@angular/common';
import { afterNextRender } from '@angular/core';

import { Router, RouterLink } from '@angular/router';
import { ReadingProgressService } from '../../services/reading-progress.service';
@Component({
  imports: [DatePipe, RouterLink],
  selector: 'app-story-preview',
  styleUrl: './story-preview.css',
  templateUrl: './story-preview.html',
})
export class StoryPreview {
  story = input.required<StoryDetails>(); // passed in by landing page
  closed = output<void>(); // tells landing page it was closed

  private dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog'); // popup
  private pressStartedOutside = false; // whether the mouse was pressed down outside the popup

  private progress = inject(ReadingProgressService);
  private router = inject(Router);

  // true if this reader started the story before and hasnt finished it
  protected hasProgress = computed(() => this.progress.get(this.story().story_id) !== null);

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal()); // show popup only if dialog element exists
  }

  // forgets where they were in the story (including the choices they made) and opens it from the first page
  protected startOver() {
    this.progress.clear(this.story().story_id);
    this.router.navigate(['/read', this.story().story_id]);
  }

  // returns true if the mouse is outside the popup (its rounded corners count as inside)
  private isOutsidePopup(event: MouseEvent) {
    const popup = this.dialog().nativeElement.getBoundingClientRect();
    return (
      event.clientX < popup.left ||
      event.clientX > popup.right ||
      event.clientY < popup.top ||
      event.clientY > popup.bottom
    );
  }

  // remember where the click started so dragging out of the popup doesnt close it
  protected rememberPressStarted(event: MouseEvent) {
    this.pressStartedOutside = this.isOutsidePopup(event);
  }

  // closes the popup only when the click both started and ended on the background
  protected closeOnBackdropClick(event: MouseEvent) {
    const clickedBackdrop = event.target === this.dialog().nativeElement; // not a button or text inside the popup
    if (clickedBackdrop && this.pressStartedOutside && this.isOutsidePopup(event)) {
      this.dialog().nativeElement.close();
    }
  }
}
