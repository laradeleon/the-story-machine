import { StoryInfo } from '../../models/story';
import { httpResource } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' }) // global singleton
export class StoryService {
  // api endpoint url target
  private storiesURL = 'mock/stories.json'; // mock data for now, swap in endpoint later

  getStories() {
    // get summary data from ALL stories to display on landing page
    return httpResource<StoryInfo[]>(() => this.storiesURL, { defaultValue: [] });
  }
}
