import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  inject,
  provideAppInitializer,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AuthService } from './services/auth.service';
import { authInterceptor } from './services/auth.interceptor';
import { PreviewService } from './services/preview.service';
import { WriterStateService } from './services/writer-state.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])), // adds the login token to requests
    // checks for a saved login before the first page shows, so a refresh keeps you signed in
    provideAppInitializer(() => inject(AuthService).loadCurrentUser()),
    // loads the writer's draft and the preview chapter from IndexedDB before the first page shows.
    // IndexedDB is async, so without this the pages would start with empty values for a moment.
    // once the backend gives out story ids, the writer route opens the right story itself instead
    provideAppInitializer(() =>
      Promise.all([inject(WriterStateService).open_story(), inject(PreviewService).restore()]),
    ),
  ],
};
