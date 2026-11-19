import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService, readApiError } from './auth.service';
import { clearToken, getToken, saveToken } from './auth-token';
import { GUEST_USER, User } from '../../models/auth';
import { AUTH_MESSAGES } from '../../models/auth-messages';

// a fake signed in user, like the backend would send
const mockUser: User = {
  _id: 'u1',
  email: 'ada@example.com',
  username: 'ada',
  displayName: 'Ada',
  roles: ['user'],
  bio: '',
  profileUrl: '',
  followerCount: 0,
  followingCount: 0,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
};

// what the backend sends back after a successful sign in
const loginResponse = {
  success: true,
  message: 'Login successful',
  data: { accessToken: 'abc123', tokenType: 'Bearer', expiresIn: 3600, user: mockUser },
};

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear(); // start every test signed out
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should start as the guest', () => {
    expect(service.isSignedIn()).toBe(false);
    expect(service.currentUser()).toEqual(GUEST_USER);
  });

  describe('login', () => {
    it('should send the email and password, then save the token and the user', async () => {
      const done = service.login('ada@example.com', 'Secret1!');

      const request = httpMock.expectOne('/api/v1/auth/login');
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({ email: 'ada@example.com', password: 'Secret1!' });
      request.flush(loginResponse);
      await done;

      expect(getToken()).toBe('abc123');
      expect(service.isSignedIn()).toBe(true);
      expect(service.currentUser()).toEqual(mockUser);
    });

    it('should stay signed out when the details are wrong', async () => {
      const done = service.login('ada@example.com', 'wrong');
      httpMock
        .expectOne('/api/v1/auth/login')
        .flush(
          { success: false, message: 'Invalid credentials' },
          { status: 401, statusText: 'Unauthorized' },
        );

      await expect(done).rejects.toBeInstanceOf(HttpErrorResponse);
      expect(getToken()).toBeNull();
      expect(service.isSignedIn()).toBe(false);
    });
  });

  describe('register', () => {
    it('should send the new account details to the backend', async () => {
      const details = { email: 'ada@example.com', username: 'ada', password: 'Secret1!' };
      const done = service.register(details);

      const request = httpMock.expectOne('/api/v1/user');
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual(details);
      request.flush({ success: true, message: 'User created', data: mockUser });
      await done;

      // making an account doesn't sign you in by itself, the popup does that next
      expect(service.isSignedIn()).toBe(false);
    });

    it('should fail when the email or username is taken', async () => {
      const done = service.register({ email: 'a@b.com', username: 'ada', password: 'Secret1!' });
      httpMock
        .expectOne('/api/v1/user')
        .flush(
          { success: false, message: 'Oppsss!! Email or Username has been taken' },
          { status: 409, statusText: 'Conflict' },
        );

      await expect(done).rejects.toBeInstanceOf(HttpErrorResponse);
    });
  });

  describe('logout', () => {
    it('should forget the token and go back to the guest', async () => {
      const done = service.login('ada@example.com', 'Secret1!');
      httpMock.expectOne('/api/v1/auth/login').flush(loginResponse);
      await done;

      service.logout();

      expect(getToken()).toBeNull();
      expect(service.isSignedIn()).toBe(false);
      expect(service.currentUser()).toEqual(GUEST_USER);
    });
  });

  describe('loadCurrentUser (when the app starts)', () => {
    it('should not ask the backend when there is no saved token', async () => {
      await service.loadCurrentUser();

      httpMock.expectNone('/api/v1/auth/me');
      expect(service.isSignedIn()).toBe(false);
    });

    it('should sign back in with a saved token, so a refresh keeps you signed in', async () => {
      saveToken('abc123');
      const done = service.loadCurrentUser();

      httpMock.expectOne('/api/v1/auth/me').flush({ success: true, message: 'ok', data: mockUser });
      await done;

      expect(service.isSignedIn()).toBe(true);
      expect(service.currentUser()).toEqual(mockUser);
    });

    it('should sign out when the saved token has run out', async () => {
      saveToken('old-token');
      const done = service.loadCurrentUser();

      httpMock
        .expectOne('/api/v1/auth/me')
        .flush(
          { success: false, message: 'Unauthorized' },
          { status: 401, statusText: 'Unauthorized' },
        );
      await done; // doesn't throw, the app should still start

      expect(getToken()).toBeNull();
      expect(service.isSignedIn()).toBe(false);
    });

    it('should keep the token when the server is down, so the next visit can sign back in', async () => {
      saveToken('abc123');
      const done = service.loadCurrentUser();

      httpMock
        .expectOne('/api/v1/auth/me')
        .flush('', { status: 504, statusText: 'Gateway Timeout' });
      await done;

      expect(getToken()).toBe('abc123');
      expect(service.isSignedIn()).toBe(false); // a guest for now
    });

    it('should stop waiting for a slow server so the page still shows', async () => {
      vi.useFakeTimers();
      saveToken('abc123');
      const done = service.loadCurrentUser();
      const request = httpMock.expectOne('/api/v1/auth/me');

      await vi.advanceTimersByTimeAsync(5000);
      await done;

      expect(request.cancelled).toBe(true);
      expect(getToken()).toBe('abc123');
      vi.useRealTimers();
    });
  });

  describe('other tabs', () => {
    // what the browser sends to every other tab when the saved token changes
    function tokenChangedInAnotherTab() {
      window.dispatchEvent(new StorageEvent('storage', { key: 'tsm_token' }));
      return new Promise((resolve) => setTimeout(resolve)); // let this tab catch up
    }

    it('should sign out when another tab signs out', async () => {
      const done = service.login('ada@example.com', 'Secret1!');
      httpMock.expectOne('/api/v1/auth/login').flush(loginResponse);
      await done;

      clearToken(); // the other tab signed out
      await tokenChangedInAnotherTab();

      expect(service.isSignedIn()).toBe(false);
    });

    it('should sign in when another tab signs in', async () => {
      saveToken('abc123'); // the other tab signed in
      const done = tokenChangedInAnotherTab();
      httpMock.expectOne('/api/v1/auth/me').flush({ success: true, message: 'ok', data: mockUser });
      await done;

      expect(service.currentUser()).toEqual(mockUser);
    });
  });
});

describe('readApiError', () => {
  // builds an error like the one HttpClient gives when the backend says no
  function backendError(status: number, body: unknown) {
    return new HttpErrorResponse({ status, error: body, url: '/api/v1/user' });
  }

  it('should give a general message for errors that are not from the backend', () => {
    expect(readApiError(new Error('oops'))).toEqual({
      message: AUTH_MESSAGES.unknownError,
      fieldErrors: {},
    });
  });

  it('should say the server cannot be reached when the request never got there', () => {
    expect(readApiError(backendError(0, null)).message).toBe(AUTH_MESSAGES.serverUnreachable);
  });

  it('should say the account already exists for a 409', () => {
    const error = backendError(409, {
      success: false,
      message: 'Email or Username has been taken',
    });
    expect(readApiError(error).message).toBe(AUTH_MESSAGES.accountTaken);
  });

  it('should put the backend messages under the right fields, keeping the first for each', () => {
    const error = backendError(400, {
      success: false,
      message: 'Validation failed',
      errors: [
        { field: 'password', message: 'Password is too weak' },
        { field: 'password', message: 'Password is too short' },
        { field: 'username', message: 'Username is too long' },
      ],
    });

    expect(readApiError(error)).toEqual({
      message: AUTH_MESSAGES.checkFields,
      fieldErrors: { password: 'Password is too weak', username: 'Username is too long' },
    });
  });

  it("should show the backend's own message when there are no field errors", () => {
    const error = backendError(401, { success: false, message: 'Invalid credentials' });
    expect(readApiError(error)).toEqual({ message: 'Invalid credentials', fieldErrors: {} });
  });

  it("should not show the backend's crash message to the user", () => {
    const error = backendError(500, { success: false, message: 'Internal server error' });
    expect(readApiError(error).message).toBe(AUTH_MESSAGES.unknownError);
  });

  it('should say the server cannot be reached when the proxy gets no answer', () => {
    expect(readApiError(backendError(504, 'Gateway Timeout')).message).toBe(
      AUTH_MESSAGES.serverUnreachable,
    );
  });

  it('should fall back to a general message when the backend sends no message', () => {
    expect(readApiError(backendError(500, null)).message).toBe(AUTH_MESSAGES.unknownError);
  });
});
