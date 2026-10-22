import { Routes } from '@angular/router';
import { Landing } from './pages/landing/landing';
import { Reader } from './pages/reader/reader';

export const routes: Routes = [
  { path: '', component: Landing }, //home page
  { path: 'read/:storyId', component: Reader },
];
