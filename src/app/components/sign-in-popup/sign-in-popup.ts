import {
  Component,
  ElementRef,
  afterNextRender,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService, readApiError } from '../../services/auth.service';

/**
 * SignInPopup
 *
 * Opened by the Profile button on the landing page.
 * Signed out: a sign in form (email or username and password) and a link to create an account.
 * Signed in: who you're signed in as and a sign out button.
 * Closes the same ways as the story preview: the x, esc, or clicking the background.
 */
@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-sign-in-popup',
  styleUrls: ['../../styles/auth-form.css', './sign-in-popup.css'],
  templateUrl: './sign-in-popup.html',
})
export class SignInPopup {
  closed = output<void>(); // tells the landing page it was closed

  protected auth = inject(AuthService);
  private dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog'); // popup
  private pressStartedOutside = false; // whether the mouse was pressed down outside the popup

  protected form = new FormGroup({
    identifier: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  protected submitting = signal(false);
  protected errorMessage = signal<string | null>(null); // shown above the form

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal()); // show popup once it exists
  }

  protected close() {
    this.dialog().nativeElement.close(); // fires (close), which tells the landing page
  }

  protected async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched(); // shows the "required" messages
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    try {
      const { identifier, password } = this.form.getRawValue();
      await this.auth.login(identifier, password);
      this.close(); // signed in, nothing else to do in the popup
    } catch (error) {
      // the backend gives the same message whether the account exists or not
      this.errorMessage.set(readApiError(error).message);
      this.form.controls.password.reset(); // so the wrong password isn't left in the box
    } finally {
      this.submitting.set(false);
    }
  }

  protected async signOut() {
    await this.auth.logout();
    this.form.reset(); // the popup switches back to the sign in form
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
      this.close();
    }
  }
}
