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
import { ChapterNotFoundError } from '../../models/errors';

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
        const authorIds = [...new Set(stories.map((story) => story.authorId))];

        const authorResults = await Promise.allSettled(
          // one failed request only loses that one author's name, not all the authors its already retrieved
          authorIds.map((id) =>
            firstValueFrom(this.http.get<APIResponse<UserResponse>>(`${this.usersURL}/${id}`)),
          ),
        );

        // lookup for author id -> name
        const authorNames = new Map<string, string>();
        for (const result of authorResults) {
          if (result.status === 'fulfilled') {
            authorNames.set(result.value.data._id, result.value.data.displayName);
          }
        }

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
          throw new ChapterNotFoundError(params.storyId, params.chapterIndex); // reader shows its no chapters message
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
