import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { APIResponse } from '../../models/api';
import { ApiErrorBody, GUEST_USER, LoginResult, RegisterDetails, User } from '../../models/auth';
import { clearToken, getToken, saveToken } from './auth-token';

/**
 * AuthService
 *
 * Keeps track of who is signed in for the whole app.
 * Signing in gives back a login token, which gets saved in the browser (auth-token.ts)
 * and added to every request by the auth interceptor (auth.interceptor.ts).
 */
@Injectable({ providedIn: 'root' }) // global singleton
export class AuthService {
  private http = inject(HttpClient);
  private authURL = '/api/v1/auth';
  private usersURL = '/api/v1/user';

  // the signed in user, or null if nobody is signed in
  private user = signal<User | null>(null);
  // the guest user until someone signs in, so pages always have a user to show
  readonly currentUser = computed(() => this.user() ?? GUEST_USER);
  readonly isSignedIn = computed(() => this.user() !== null); // false while you're the guest

  // runs once when the app starts, if there's a saved token it asks the backend who it belongs to
  // so a refresh keeps you signed in
  async loadCurrentUser() {
    if (!getToken()) {
      return; // never signed in, stay the guest
    }
    try {
      const response = await firstValueFrom(this.http.get<APIResponse<User>>(`${this.authURL}/me`));
      this.user.set(response.data);
    } catch {
      this.logout(); // token ran out or isn't valid any more
    }
  }

  // creates the account then signs straight in with the same details
  async register(details: RegisterDetails) {
    await firstValueFrom(this.http.post(this.usersURL, details));
    await this.login(details.email, details.password);
  }

  // the backend checks the email and password and gives back a login token and the user
  async login(email: string, password: string) {
    const response = await firstValueFrom(
      this.http.post<APIResponse<LoginResult>>(`${this.authURL}/login`, { email, password }),
    );
    saveToken(response.data.accessToken);
    this.user.set(response.data.user);
  }

  // the backend has no logout, forgetting the token is enough
  logout() {
    clearToken();
    this.user.set(null);
  }
}

// turns an error from the backend into a message for the whole form and messages for each field
export function readApiError(error: unknown): {
  message: string;
  fieldErrors: Record<string, string>;
} {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return { message: "Can't reach the server right now, try again.", fieldErrors: {} };
    }
    const body = error.error as Partial<ApiErrorBody> | null;
    const fieldErrors: Record<string, string> = {};
    for (const fieldError of body?.errors ?? []) {
      fieldErrors[fieldError.field] ??= fieldError.message; // first message for each field
    }
    return { message: body?.message ?? 'Something went wrong, try again.', fieldErrors };
  }
  return { message: 'Something went wrong, try again.', fieldErrors: {} };
}
