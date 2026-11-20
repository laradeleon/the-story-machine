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

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])), // adds the login token to requests
    // checks for a saved login before the first page shows, so a refresh keeps you signed in
    provideAppInitializer(() => inject(AuthService).loadCurrentUser()),
    // loads the preview chapter before the first page, so a refreshed preview isn't empty.
    // the writer's draft is opened by the /write/:storyId route instead
    provideAppInitializer(() => inject(PreviewService).restore()),
  ],
};
