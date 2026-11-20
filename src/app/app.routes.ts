import { Routes } from '@angular/router';
import { Landing } from './pages/landing/landing';
import { Reader } from './pages/reader/reader';
import { Profile } from './pages/profile/profile';
import { open_story_from_url } from './pages/writer/open-story';

export const routes: Routes = [
  { path: '', component: Landing }, //home page
  { path: 'read/:storyId', component: Reader },
  { path: 'profile/:userId', component: Profile }, // a user profile's page
  // plays the writer's script instead of a saved story. the id is the story to go back to
  { path: 'preview/:storyId', component: Reader, data: { preview: true } },
  { path: 'preview', component: Reader, data: { preview: true } }, // older links with no story id
  // a story has to be made with Write Story first, which goes to /write/<new id>
  { path: 'write', redirectTo: '', pathMatch: 'full' },
  {
    path: 'write/:storyId',
    // loaded only when someone opens the writer so the editor isn't downloaded on every page
    loadComponent: () => import('./pages/writer/writer').then((m) => m.Writer),
    resolve: { opened: open_story_from_url }, // the editor starts with this story's script
  },
];
