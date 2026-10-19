import { Routes } from '@angular/router';
import { Landing } from './pages/landing/landing';
import { Read } from './pages/read/read';

export const routes: Routes = [
  { path: '', component: Landing }, //home page
  { path: 'read', component: Read },
];
