import {
  Component,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
  ElementRef,
} from '@angular/core';
import { StoryDetails } from '../../../models/story-details';
import { DatePipe } from '@angular/common';
import { afterNextRender } from '@angular/core';

import { Router, RouterLink } from '@angular/router';
import { ReadingProgressService } from '../../services/reading-progress.service';
import { AuthService } from '../../services/auth.service';
import { StoryService } from '../../services/story.service';
import { WriterStateService } from '../../services/writer-state.service';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';
@Component({
  imports: [DatePipe, RouterLink, ConfirmDialog],
  selector: 'app-story-preview',
  styleUrl: './story-preview.css',
  templateUrl: './story-preview.html',
})
export class StoryPreview {
  story = input.required<StoryDetails>(); // passed in by landing page
  closed = output<void>(); // tells landing page it was closed
  deleted = output<void>(); // tells the page to reload its stories after the author deletes this one

  private dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog'); // popup
  private pressStartedOutside = false; // whether the mouse was pressed down outside the popup

  private progress = inject(ReadingProgressService);
  private router = inject(Router);
  private auth = inject(AuthService);
  private stories = inject(StoryService);
  private writer = inject(WriterStateService);

  // true if this reader started the story before and hasnt finished it
  protected hasProgress = computed(() => this.progress.get(this.story().story_id) !== null);

  // true when the signed in user wrote this story, so they get edit and delete
  protected isAuthor = computed(
    () => this.auth.isSignedIn() && this.auth.currentUser()._id === this.story().author_id,
  );

  protected deleting = signal(false); // while the delete is on its way to the backend
  protected deleteError = signal<string | null>(null); // why the last delete didn't work
  protected opening = signal(false); // while the story is being fetched for the writer page
  protected editError = signal<string | null>(null); // why the last edit didn't open
  protected confirmDeleteOpen = signal(false); // whether the "are you sure?" popup is open
  protected deleteMessage = computed(() => `This story will be deleted. This can't be undone.`);

  // gets the saved story from the backend, puts it in the writer and opens the writer page
  protected async edit_story() {
    this.opening.set(true);
    this.editError.set(null);
    try {
      const story_id = this.story().story_id;
      const saved = await this.stories.get_saved_story(story_id);
      await this.writer.open_saved_story(story_id, saved);
      await this.router.navigate(['/write']);
    } catch {
      this.editError.set("Sorry, this story couldn't be opened. Please try again.");
    } finally {
      this.opening.set(false);
    }
  }

  // runs once the author confirms in the popup, deletes the story and closes the preview
  protected async delete_story() {
    this.deleting.set(true);
    this.deleteError.set(null);
    try {
      await this.stories.delete_story(this.story().story_id);
      this.progress.clear(this.story().story_id); // nothing left to continue reading
      this.deleted.emit();
      this.dialog().nativeElement.close();
    } catch {
      this.deleteError.set("Sorry, this story couldn't be deleted. Please try again.");
    } finally {
      this.deleting.set(false);
    }
  }

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
