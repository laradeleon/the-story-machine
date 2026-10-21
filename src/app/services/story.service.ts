import { HttpClient } from '@angular/common/http';
import { Injectable, inject, resource } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { APIResponse, StoryResponse, UserResponse } from '../../models/api';
import { StoryInfo } from '../../models/story';

@Injectable({ providedIn: 'root' }) // global singleton
export class StoryService {
  private http = inject(HttpClient);

  // api endpoint urls
  private storiesURL = '/api/v1/story?status=published';
  private usersURL = '/api/v1/user';

  // gets every published story to show as a card on the landing page
  getStories() {
    return resource({
      defaultValue: [] as StoryInfo[],

      loader: async () => {
        //get all the stories that have been published already
        const storiesResponse = await firstValueFrom(
          this.http.get<APIResponse<StoryResponse[]>>(this.storiesURL),
        );
        const stories = storiesResponse.data;

        // responses when retrieving stories only return with author id, so need to retrieve each authors name separately using this id
        const authorIds = [...new Set(stories.map((story) => story.authorId))]; // removes duplicates so a user is only retrieved once
        // request for all author names at once
        const authorResponses = await Promise.all(
          authorIds.map((id) =>
            firstValueFrom(this.http.get<APIResponse<UserResponse>>(`${this.usersURL}/${id}`)),
          ),
        );

        // lookup for author id -> name
        const authorNames = new Map(
          authorResponses.map((response) => [response.data._id, response.data.displayName]),
        );

        // turn backends stories into StoryInfo format for display on landing page
        return stories.map((story) => ({
          story_id: story._id,
          title: story.title,
          author: authorNames.get(story.authorId) ?? 'Unknown author',
        }));
      },
    });
  }
}
