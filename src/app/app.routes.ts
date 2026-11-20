import { Routes } from '@angular/router';
import { Landing } from './pages/landing/landing';
import { Reader } from './pages/reader/reader';
import { Profile } from './pages/profile/profile';

export const routes: Routes = [
  { path: '', component: Landing }, //home page
  { path: 'read/:storyId', component: Reader },
  { path: 'profile/:userId', component: Profile }, // a user profile's page
  { path: 'preview', component: Reader, data: { preview: true } }, // plays the writer's script instead of a saved story
  // loaded only when someone opens the writer so the editor isn't downloaded on every page
  { path: 'write', loadComponent: () => import('./pages/writer/writer').then((m) => m.Writer) },
];
