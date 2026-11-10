import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { APIResponse } from '../../models/api';
import { ApiErrorBody, RegisterDetails, User } from '../../models/auth';

/**
 * AuthService
 *
 * Keeps track of who is signed in for the whole app.
 * The backend keeps the session in an http only cookie, so this service never sees the token itself,
 * the browser just sends the cookie with every request to /api automatically.
 */
@Injectable({ providedIn: 'root' }) // global singleton
export class AuthService {
  private http = inject(HttpClient);
  private authURL = '/api/v1/auth';

  // the signed in user, or null if nobody is signed in
  private user = signal<User | null>(null);
  readonly currentUser = this.user.asReadonly();
  readonly isSignedIn = computed(() => this.user() !== null);

  // asks the backend who is signed in, runs once when the app starts so a refresh keeps you signed in
  async loadCurrentUser() {
    try {
      const response = await firstValueFrom(this.http.get<APIResponse<User>>(`${this.authURL}/me`));
      this.user.set(response.data);
    } catch {
      this.user.set(null); // not signed in, or the session ran out
    }
  }

  // creates the account, the backend signs the new user in straight away
  async register(details: RegisterDetails) {
    const response = await firstValueFrom(
      this.http.post<APIResponse<User>>(`${this.authURL}/register`, details),
    );
    this.user.set(response.data);
  }

  // identifier can be an email or a username
  async login(identifier: string, password: string) {
    const response = await firstValueFrom(
      this.http.post<APIResponse<User>>(`${this.authURL}/login`, { identifier, password }),
    );
    this.user.set(response.data);
  }

  async logout() {
    try {
      await firstValueFrom(this.http.post(`${this.authURL}/logout`, {}));
    } finally {
      this.user.set(null); // signed out on this page even if the request failed
    }
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
