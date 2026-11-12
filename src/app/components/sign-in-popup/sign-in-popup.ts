import {
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { AuthService, readApiError } from '../../services/auth.service';

// the same password rules the backend checks, shown as a checklist while you type
const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (password: string) => password.length >= 8 },
  { label: 'An uppercase letter', test: (password: string) => /[A-Z]/.test(password) },
  { label: 'A lowercase letter', test: (password: string) => /[a-z]/.test(password) },
  { label: 'A number', test: (password: string) => /\d/.test(password) },
  { label: 'A symbol, like ! or ?', test: (password: string) => /[^A-Za-z0-9]/.test(password) },
];

// fails until the password passes every rule above
const strongPassword: ValidatorFn = (control) =>
  PASSWORD_RULES.every((rule) => rule.test(control.value)) ? null : { weakPassword: true };

// fails when the two password boxes are different
const passwordsMatch: ValidatorFn = (form) =>
  form.get('password')?.value === form.get('confirmPassword')?.value
    ? null
    : { passwordsDontMatch: true };

/**
 * SignInPopup
 *
 * Opened by the Profile button on the landing page, only shown to guests.
 * Has two forms: sign in, and create account. A link at the bottom switches between them.
 * Closes the same ways as the story preview: the x, esc, or clicking the background.
 */
@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-sign-in-popup',
  styleUrls: ['../../styles/auth-form.css', './sign-in-popup.css'],
  templateUrl: './sign-in-popup.html',
})
export class SignInPopup {
  closed = output<void>(); // tells the landing page it was closed

  private auth = inject(AuthService);
  private dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog'); // popup
  private pressStartedOutside = false; // whether the mouse was pressed down outside the popup

  protected mode = signal<'signIn' | 'createAccount'>('signIn'); // which form is showing

  protected signInForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  protected createAccountForm = new FormGroup(
    {
      email: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.email],
      }),
      // 3 to 9 characters, only letters, numbers and underscores
      username: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.pattern(/^[a-zA-Z0-9_]{3,9}$/)],
      }),
      password: new FormControl('', { nonNullable: true, validators: [strongPassword] }),
      confirmPassword: new FormControl('', { nonNullable: true }),
    },
    { validators: passwordsMatch },
  );

  // ticks each password rule off while you type
  private newPassword = toSignal(this.createAccountForm.controls.password.valueChanges, {
    initialValue: '',
  });
  protected passwordChecks = computed(() =>
    PASSWORD_RULES.map((rule) => ({ label: rule.label, met: rule.test(this.newPassword()) })),
  );

  protected submitting = signal(false);
  protected errorMessage = signal<string | null>(null); // shown above the form
  protected fieldErrors = signal<Record<string, string>>({}); // backend messages under each field

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal()); // show popup once it exists
  }

  protected close() {
    this.dialog().nativeElement.close(); // fires (close), which tells the landing page
  }

  // swaps between the sign in and create account forms
  protected switchTo(mode: 'signIn' | 'createAccount') {
    this.mode.set(mode);
    this.errorMessage.set(null);
    this.fieldErrors.set({});
  }

  protected async signIn() {
    if (this.signInForm.invalid) {
      this.signInForm.markAllAsTouched(); // shows the "required" messages
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    try {
      const { email, password } = this.signInForm.getRawValue();
      await this.auth.login(email, password);
      this.close(); // signed in, nothing else to do in the popup
    } catch (error) {
      // the backend gives the same message whether the account exists or not
      this.errorMessage.set(readApiError(error).message);
      this.signInForm.controls.password.reset(); // so the wrong password isn't left in the box
    } finally {
      this.submitting.set(false);
    }
  }

  // makes the account, then signs straight in
  protected async createAccount() {
    if (this.createAccountForm.invalid) {
      this.createAccountForm.markAllAsTouched(); // shows the messages under each field
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    this.fieldErrors.set({});
    try {
      const { email, username, password } = this.createAccountForm.getRawValue();
      await this.auth.register({ email, username, password });
      this.close(); // account made and signed in
    } catch (error) {
      // e.g. "Email or Username has been taken", or a field the backend didn't like
      const { message, fieldErrors } = readApiError(error);
      this.errorMessage.set(message);
      this.fieldErrors.set(fieldErrors);
    } finally {
      this.submitting.set(false);
    }
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
