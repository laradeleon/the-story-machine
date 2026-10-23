import { Routes } from '@angular/router';
import { Landing } from './pages/landing/landing';
import { Reader } from './pages/reader/reader';

export const routes: Routes = [
  { path: '', component: Landing }, //home page
  { path: 'read/:storyId', component: Reader },
  // loaded only when someone opens the writer so the editor isn't downloaded on every page
  { path: 'write', loadComponent: () => import('./pages/writer/writer').then((m) => m.Writer) },
];
