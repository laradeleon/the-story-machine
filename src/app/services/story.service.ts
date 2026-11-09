import { HttpClient } from '@angular/common/http';
import { Injectable, inject, resource } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  APIResponse,
  StoryResponse,
  UserResponse,
  ChapterResponse,
  ChapterSummaryResponse,
} from '../../models/api';
import { StoryDetails } from '../../models/story-details';
import { Chapter } from '../../models/chapter';

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
          this.http.get<APIResponse<StoryResponse[]>>(this.storiesURL, {
            params: { status: 'published' }, // only published stories are displayed on home page
          }),
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

  // gets one chapter of a story, which includes the chapter title and the lines of content
  // 0 is the first chapter
  getChapter(storyId: () => string, chapterIndex: () => number) {
    return resource({
      params: () => ({ storyId: storyId(), chapterIndex: chapterIndex() }), // id and index are functions, so resourec is reloased whenever user goes to next chapter

      loader: async ({ params }): Promise<Chapter> => {
        const chaptersURL = `${this.storiesURL}/${params.storyId}/chapter`;

        // the list of chapters comes back in reading order, but without their lines
        const listResponse = await firstValueFrom(
          this.http.get<APIResponse<ChapterSummaryResponse[]>>(chaptersURL),
        );
        const chapters = listResponse.data;
        const summary = chapters[params.chapterIndex];
        if (!summary) {
          throw new Error('This story has no chapter at that position'); // reader shows its sorry message
        }

        // then get that one chapter by its id, which contains that chapter's content
        const chapterResponse = await firstValueFrom(
          this.http.get<APIResponse<ChapterResponse>>(`${chaptersURL}/${summary.chapter_id}`),
        );
        const chapter = chapterResponse.data;

        return {
          title: chapter.chapter_name,
          lines: chapter.story?.lines ?? [], // a chapter with no script saved yet will display nothing
          hasNextChapter: params.chapterIndex < chapters.length - 1,
        };
      },
    });
  }
}
