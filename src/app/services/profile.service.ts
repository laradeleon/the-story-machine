import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { APIResponse, StoryResponse } from '../../models/api';

// user ids from backend are 24 character hex strings
const USER_ID_PATTERN = /^[a-f0-9]{24}$/i;

/**
 * ProfileService
 *
 * Looks up other people's profiles.
 * - user lookup endpoints using id arent public
 * - finds one of their published stories and takes the author's name from it
 */
@Injectable({ providedIn: 'root' }) // singleton
export class ProfileService {
  private http = inject(HttpClient);
  private storiesURL = '/api/v1/story';

  // the display name of the user with this id or null if we can't find them
  async getDisplayName(userId: string): Promise<string | null> {
    if (!USER_ID_PATTERN.test(userId)) {
      return null;
    }

    // just need one story to get authors display name
    const response = await firstValueFrom(
      this.http.get<APIResponse<StoryResponse[]>>(this.storiesURL, {
        params: { authorId: userId, status: 'published', limit: 1 },
      }),
    );
    const story = response.data[0];
    if (!story || !story.author) {
      return null;
    }
    return story.author.displayName;
  }
}
