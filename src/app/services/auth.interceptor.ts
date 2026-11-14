import { HttpInterceptorFn } from '@angular/common/http';
import { getToken } from './auth-token';

// adds "Authorization: Bearer <token>" to every request to our backend while you're signed in,
// that's how the backend knows who is asking (creating stories, /auth/me, etc.)
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = getToken();
  // only our own /api, so the token never gets sent anywhere else
  if (!token || !request.url.startsWith('/api')) {
    return next(request);
  }
  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
