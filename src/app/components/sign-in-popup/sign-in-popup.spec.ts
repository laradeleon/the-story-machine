import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthFormMode, SignInPopup } from './sign-in-popup';
import { AuthService } from '../../services/auth.service';
import { AUTH_MESSAGES } from '../../../models/auth-messages';

// a password that passes every rule
const GOOD_PASSWORD = 'Secret1!';

// builds an error like the one HttpClient gives when the backend says no
function backendError(status: number, body: unknown) {
  return new HttpErrorResponse({ status, error: body });
}

describe('SignInPopup', () => {
  let fixture: ComponentFixture<SignInPopup>;
  let compiled: HTMLElement;
  let closed = vi.fn<() => void>(); // checks if the popup told the landing page it closed
  // fake auth service so nothing gets sent to the backend, each test decides what it answers
  let auth: { login: ReturnType<typeof vi.fn>; register: ReturnType<typeof vi.fn> };

  // the real showModal and close (these don't exist in the test browser)
  const realShowModal = HTMLDialogElement.prototype.showModal;
  const realClose = HTMLDialogElement.prototype.close;

  // opens the popup on the sign in form, or on the form given
  async function openPopup(startMode?: AuthFormMode) {
    // marks the popup as open like the real one, so the boxes inside it can get focus
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    });
    // a real popup fires "close" when it closes, so the fake one does too
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.dispatchEvent(new Event('close'));
    });
    auth = {
      login: vi.fn().mockResolvedValue(undefined),
      register: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [SignInPopup],
      providers: [{ provide: AuthService, useValue: auth }],
    }).compileComponents();

    fixture = TestBed.createComponent(SignInPopup);
    if (startMode) {
      fixture.componentRef.setInput('startMode', startMode);
    }
    closed = vi.fn<() => void>();
    fixture.componentInstance.closed.subscribe(closed);
    compiled = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  }

  afterEach(() => {
    // put the real ones back so the fakes don't affect other tests
    HTMLDialogElement.prototype.showModal = realShowModal;
    HTMLDialogElement.prototype.close = realClose;
  });

  // types into the input with that formControlName, like a user would
  async function type(field: string, value: string) {
    const input = compiled.querySelector<HTMLInputElement>(`input[formControlName="${field}"]`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur')); // counts as having visited the field
    await fixture.whenStable();
  }

  // presses the submit button and waits for the backend (the fake one) to answer
  async function submit() {
    compiled.querySelector('form')!.dispatchEvent(new Event('submit'));
    await new Promise((resolve) => setTimeout(resolve)); // lets the sign in / register finish
    await fixture.whenStable();
  }

  function heading() {
    return compiled.querySelector('#sign-in-title')?.textContent?.trim();
  }

  function clickButton(text: string) {
    const buttons = Array.from(compiled.querySelectorAll('button'));
    buttons.find((button) => button.textContent?.trim() === text)!.click();
    return fixture.whenStable();
  }

  describe('opening and switching forms', () => {
    it('should open as a popup on the sign in form', async () => {
      await openPopup();
      expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
      expect(heading()).toBe('Sign in');
    });

    it('should open on the create account form when asked to', async () => {
      await openPopup('createAccount');
      expect(heading()).toBe('Create an account');
    });

    it('should switch between the two forms with the links at the bottom', async () => {
      await openPopup();
      await clickButton('Create an account');
      expect(heading()).toBe('Create an account');

      await clickButton('Sign in');
      expect(heading()).toBe('Sign in');
    });

    it('should start in the email box so you can type straight away', async () => {
      await openPopup();
      expect(document.activeElement).toBe(compiled.querySelector('input[type="email"]'));
    });

    it('should tell the landing page when it is closed with the x', async () => {
      await openPopup();
      (compiled.querySelector('.close-button') as HTMLButtonElement).click();
      expect(closed).toHaveBeenCalled();
    });
  });

  describe('signing in', () => {
    beforeEach(() => openPopup());

    it('should ask for the email and password when they are left empty', async () => {
      await submit();

      expect(compiled.textContent).toContain(AUTH_MESSAGES.emailRequired);
      expect(compiled.textContent).toContain(AUTH_MESSAGES.passwordRequired);
      expect(auth.login).not.toHaveBeenCalled();
    });

    it("should say when the email doesn't look like an email", async () => {
      await type('email', 'not-an-email');
      expect(compiled.textContent).toContain(AUTH_MESSAGES.emailInvalid);
    });

    it('should not allow an email without a domain like .com', async () => {
      await type('email', 'ada@localhost');
      await type('password', GOOD_PASSWORD);
      await submit();

      expect(compiled.textContent).toContain(AUTH_MESSAGES.emailInvalid);
      expect(auth.login).not.toHaveBeenCalled();
    });

    it("should show the backend's field message at the top, since this form has none under its fields", async () => {
      auth.login.mockRejectedValue(
        backendError(400, {
          success: false,
          message: 'Validation failed',
          errors: [{ field: 'email', message: 'email must be an email' }],
        }),
      );
      await type('email', 'ada@example.com');
      await type('password', GOOD_PASSWORD);
      await submit();

      expect(compiled.querySelector('.form-error')?.textContent).toContain(
        'email must be an email',
      );
    });

    it('should sign in and close the popup', async () => {
      await type('email', 'ada@example.com');
      await type('password', GOOD_PASSWORD);
      await submit();

      expect(auth.login).toHaveBeenCalledWith('ada@example.com', GOOD_PASSWORD);
      expect(closed).toHaveBeenCalled();
    });

    it("should show the backend's message and empty the password when the details are wrong", async () => {
      auth.login.mockRejectedValue(
        backendError(401, { success: false, message: 'Invalid credentials' }),
      );
      await type('email', 'ada@example.com');
      await type('password', 'wrong');
      await submit();

      expect(compiled.querySelector('.form-error')?.textContent).toContain('Invalid credentials');
      const password = compiled.querySelector<HTMLInputElement>('input[type="password"]')!;
      expect(password.value).toBe('');
      expect(closed).not.toHaveBeenCalled();
    });
  });

  describe('creating an account', () => {
    beforeEach(() => openPopup('createAccount'));

    // fills in every field with details that pass the checks
    async function fillInGoodDetails() {
      await type('email', 'ada@example.com');
      await type('username', 'ada');
      await type('password', GOOD_PASSWORD);
      await type('confirmPassword', GOOD_PASSWORD);
    }

    it('should tick off each password rule as it is met', async () => {
      const metRules = () =>
        Array.from(compiled.querySelectorAll('.password-rules .rule-met')).length;
      expect(metRules()).toBe(0);

      await type('password', 'abc'); // only a lowercase letter
      expect(metRules()).toBe(1);

      await type('password', GOOD_PASSWORD); // every rule
      expect(metRules()).toBe(5);
    });

    it('should not allow usernames with spaces or symbols', async () => {
      await type('username', 'ad a!');
      expect(compiled.textContent).toContain(AUTH_MESSAGES.usernameRules);
      expect(compiled.querySelector('.field-error')?.textContent).toContain(
        AUTH_MESSAGES.usernameRules,
      );
    });

    it('should not allow "guest" as a username', async () => {
      await type('username', 'Guest');
      expect(compiled.textContent).toContain(AUTH_MESSAGES.usernameReserved);
    });

    it("should say why nothing happens when the password doesn't meet the rules", async () => {
      await type('email', 'ada@example.com');
      await type('username', 'ada');
      await type('password', 'weakpass');
      await type('confirmPassword', 'weakpass');
      await submit();

      expect(compiled.textContent).toContain(AUTH_MESSAGES.passwordWeak);
      expect(auth.register).not.toHaveBeenCalled();
    });

    it('should not allow passwords over 72 bytes', async () => {
      await type('password', 'Aa1!' + '😀'.repeat(18)); // 4 + 18 emojis × 4 bytes = 76 bytes
      expect(compiled.textContent).toContain(AUTH_MESSAGES.passwordTooLong);
    });

    it("should say when the two passwords don't match", async () => {
      await type('password', GOOD_PASSWORD);
      await type('confirmPassword', 'Different1!');
      expect(compiled.textContent).toContain(AUTH_MESSAGES.passwordsDontMatch);
    });

    it('should not send anything while the form has problems', async () => {
      await type('email', 'ada@example.com');
      await type('username', 'ada');
      await type('password', 'weak');
      await type('confirmPassword', 'weak');
      await submit();

      expect(auth.register).not.toHaveBeenCalled();
    });

    it('should make the account, sign in straight away and close the popup', async () => {
      await fillInGoodDetails();
      await submit();

      expect(auth.register).toHaveBeenCalledWith({
        email: 'ada@example.com',
        username: 'ada',
        password: GOOD_PASSWORD,
      });
      expect(auth.login).toHaveBeenCalledWith('ada@example.com', GOOD_PASSWORD);
      expect(closed).toHaveBeenCalled();
    });

    it('should say when the email or username is already taken', async () => {
      auth.register.mockRejectedValue(
        backendError(409, { success: false, message: 'Email or Username has been taken' }),
      );
      await fillInGoodDetails();
      await submit();

      expect(compiled.querySelector('.form-error')?.textContent).toContain(
        AUTH_MESSAGES.accountTaken,
      );
      expect(auth.login).not.toHaveBeenCalled();
      expect(closed).not.toHaveBeenCalled();
    });

    it("should show the backend's message under a field, and hide it once that field is edited", async () => {
      auth.register.mockRejectedValue(
        backendError(400, {
          success: false,
          message: 'Validation failed',
          errors: [{ field: 'password', message: 'Password is too common' }],
        }),
      );
      await fillInGoodDetails();
      await submit();

      expect(compiled.textContent).toContain(AUTH_MESSAGES.checkFields);
      expect(compiled.textContent).toContain('Password is too common');

      await type('password', 'Another1!');
      expect(compiled.textContent).not.toContain('Password is too common');
    });

    it('should move to the sign in form with the email filled in if signing in afterwards fails', async () => {
      auth.login.mockRejectedValue(backendError(0, null));
      await fillInGoodDetails();
      await submit();

      expect(heading()).toBe('Sign in');
      expect(compiled.querySelector('.form-notice')?.textContent).toContain(
        AUTH_MESSAGES.accountCreatedSignIn,
      );
      const email = compiled.querySelector<HTMLInputElement>('input[type="email"]')!;
      expect(email.value).toBe('ada@example.com');
      expect(closed).not.toHaveBeenCalled();
    });
  });
});
