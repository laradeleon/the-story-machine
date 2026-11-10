import { HttpClient } from '@angular/common/http';
import { Injectable, inject, resource } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { APIResponse, StoryResponse, UserResponse, ChapterResponse } from '../../models/api';
import { StoryDetails } from '../../models/story-details';
import { Chapter } from '../../models/chapter';

// the mock chapter file the reader loads until getFirstChapter uses the real api
// exported so the tests answer the same url. delete it when switching, then any test still using it won't compile
export const MOCK_CHAPTER_URL = 'mock/chapter.json'; //todo: replace with the real chapter endpoints

@Injectable({ providedIn: 'root' }) // global singleton
export class StoryService {
  private http = inject(HttpClient);

  // api endpoint urls
  private storiesURL = '/api/v1/story';
  private usersURL = '/api/v1/user';

  // gets every published story to show as a card on the landing page
  getStories() {
    return resource({
      defaultValue: [] as StoryDetails[],

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
          description: story.description,
          updatedAt: story.updatedAt,
        }));
      },
    });
  }

  getFirstChapter() {
    // gets the chapter title and the list of lines in that chapter (all the text content)
    return resource({
      loader: async (): Promise<Chapter> => {
        const response = await firstValueFrom(
          this.http.get<APIResponse<ChapterResponse>>(MOCK_CHAPTER_URL),
        );
        const chapter = response.data;
        return { title: chapter.title, lines: chapter.contents?.story.lines ?? [] }; // a valid chapter with no contents will display nothing
      },
    });
  }
}
