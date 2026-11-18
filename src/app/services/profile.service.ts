import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { APIResponse, StoryResponse } from '../../models/api';
import { StoryDetails } from '../../models/story-details';
import { toStoryDetails } from './story.service';

// user ids from backend are 24 character hex strings
const USER_ID_PATTERN = /^[a-f0-9]{24}$/i;

// the most stories the backend gives back in one go
const MAX_STORIES = 100;

/**
 * ProfileService
 *
 * Gets what profile pages need that AuthService doesn't already have.
 * - the stories a user has published, for the stories section on every profile
 * - user lookup endpoints using id arent public, so for other people's profiles
 *   their name is taken from these stories too
 */
@Injectable({ providedIn: 'root' }) // singleton
export class ProfileService {
  private http = inject(HttpClient);
  private storiesURL = '/api/v1/story';

  // every story this user has published, newest first
  // its empty if they haven't published any or if there's no user with this id
  async getPublishedStories(userId: string): Promise<StoryDetails[]> {
    if (!USER_ID_PATTERN.test(userId)) {
      return [];
    }

    const response = await firstValueFrom(
      this.http.get<APIResponse<StoryResponse[]>>(this.storiesURL, {
        params: { authorId: userId, status: 'published', limit: MAX_STORIES },
      }),
    );
    return response.data.map(toStoryDetails);
  }
}
