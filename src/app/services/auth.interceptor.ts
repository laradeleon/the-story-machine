import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { getToken } from './auth-token';
import { AuthService } from './auth.service';

// adds "Authorization: Bearer <token>" to every request to our backend while you're signed in,
// that's how the backend knows who is asking (creating stories, /auth/me, etc.)
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = getToken();
  // only our own /api, so the token never gets sent anywhere else
  if (!token || !request.url.startsWith('/api')) {
    return next(request);
  }

  const auth = inject(AuthService);
  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })).pipe(
    catchError((error: unknown) => {
      // a 401 means the backend stopped accepting this login (it ran out after an hour, or the
      // password was reset), so sign out instead of still showing the username.
      // the token check makes sure a newer sign in (e.g. from another tab) isn't thrown away
      if (error instanceof HttpErrorResponse && error.status === 401 && getToken() === token) {
        auth.logout();
      }
      return throwError(() => error); // whoever sent the request still gets the error
    }),
  );
};
