import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, resource } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SavedStory } from '../../models/saved-story';
import {
  APIResponse,
  StoryResponse,
  StoryEditResponse,
  ChapterResponse,
  ChapterSummaryResponse,
  CharacterRequest,
} from '../../models/api';
import { StoryDetails } from '../../models/story-details';
import { Chapter } from '../../models/chapter';
import { ChapterNotFoundError } from '../../models/errors';
import { StoryNode } from '../../scripting_language/ast';
import { toJSON } from '../../scripting_language/to_json';
import { StoryInfo } from '../../models/story';

// turns a story from the backend into what the story cards and preview popup show
// each story comes with its author's display name
// used by the landing page and profile pages
export function toStoryDetails(story: StoryResponse): StoryDetails {
  return {
    story_id: story._id,
    title: story.title,
    author: story.author?.displayName ?? 'Unknown author',
    author_id: story.authorId,
    description: story.description,
    updatedAt: story.updatedAt,
  };
}

// the fields of a story PATCH /story/:id can change
export interface StoryChanges {
  status?: 'draft' | 'published';
  title?: string; // can't be blank
  description?: string;
  characters?: CharacterRequest[]; // replaces the whole list
}

@Injectable({ providedIn: 'root' }) // global singleton
export class StoryService {
  private http = inject(HttpClient);

  // api endpoint urls
  private storiesURL = '/api/v1/story';

  //TODO also show unpublished stories if you are the author
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

        // turn backends stories into StoryInfo format for display on landing page
        return stories.map(toStoryDetails);
      },
    });
  }

  // deletes a story and all its chapters, the backend only lets its author do this
  async delete_story(storyId: string) {
    await firstValueFrom(this.http.delete(`${this.storiesURL}/${storyId}`));
  }

  // gets a story's script, metadata and characters for the writer page to edit
  async get_saved_story(storyId: string): Promise<SavedStory> {
    const [storyResponse, script] = await Promise.all([
      firstValueFrom(
        this.http.get<APIResponse<StoryEditResponse>>(`${this.storiesURL}/${storyId}`),
      ),
      this.get_script(storyId),
    ]);
    const story = storyResponse.data;
    return {
      script,
      metadata: { title: story.title, description: story.description },
      characters: story.characters ?? [],
      updated_at: Date.parse(story.updatedAt),
    };
  }

  // gets the story's .txt script, empty if none has been uploaded yet
  async get_script(storyId: string): Promise<string> {
    try {
      return await firstValueFrom(
        this.http.get(`${this.storiesURL}/${storyId}/file`, { responseType: 'text' }),
      );
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        return '';
      }
      throw error;
    }
  }
  //create a new story with passed title and description, and return storyID
  //postStory(storyTitle: string, storyDescription: string) {
  //  return this.http.post<APIResponse<StoryResponse>>(this.storiesURL, { title: storyTitle, description: storyDescription });
  //}

  async postStory(storyTitle: string, storyDescription: string) {
    //defaultValue: [] as StoryDetails[],

    const storiesResponse = await firstValueFrom(
      this.http.post<APIResponse<StoryResponse>>(this.storiesURL, {
        title: storyTitle,
        description: storyDescription,
      }),
    );

    return storiesResponse.data;
  }

  //change the story's status (draft or published), title or description. only the fields given are sent
  async patchStory(storyID: string, changes: StoryChanges) {
    const storiesResponse = await firstValueFrom(
      this.http.patch<APIResponse<StoryResponse>>(this.storiesURL + '/' + storyID, changes),
    );

    return storiesResponse.data;
  }

  // uploads the script as the story's .txt file, replacing any earlier one. author only
  async upload_script(storyId: string, script: string) {
    // the backend reads the "file" field and only takes plain text
    const form = new FormData();
    form.append('file', new File([script], 'draft.txt', { type: 'text/plain' }));
    await firstValueFrom(this.http.put(`${this.storiesURL}/${storyId}/file`, form));
  }

  //upload the chapter to the given storyID
  async postChapter(
    storyID: string,
    chapterTitle: string,
    storyJSON: StoryNode,
    storyInfo: StoryInfo,
  ) {
    const storyBody = toJSON(storyJSON, storyInfo).story;

    console.log({ chapter_name: chapterTitle, story: storyBody });

    const storiesResponse = await firstValueFrom(
      this.http.post<APIResponse<StoryResponse>>(this.storiesURL + '/' + storyID + '/chapter', {
        chapter_name: chapterTitle,
        story: storyBody,
      }),
    );

    return storiesResponse.data;

    //return this.http.put(this.storiesURL + '/' + storyID + '/file', {
    //chapter_name: chapterTitle,
    //story: storyJSON,
    //});
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
