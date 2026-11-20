import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, convertToParamMap, RouterStateSnapshot } from '@angular/router';
import { clear_all, save_draft } from '../../services/saved-values';
import { PLACEHOLDER_STORY_ID, WriterStateService } from '../../services/writer-state.service';
import { open_story_from_url } from './open-story';

// runs the resolver for a /write url with these params
function resolve(params: Record<string, string>) {
  const route = { paramMap: convertToParamMap(params) } as ActivatedRouteSnapshot;
  return TestBed.runInInjectionContext(() => open_story_from_url(route, {} as RouterStateSnapshot));
}

describe('open_story_from_url', () => {
  beforeEach(async () => {
    await clear_all();
  });

  it('should open the story in the url', async () => {
    await save_draft({
      story_id: 'story-1',
      script: 'Saved text',
      metadata: { title: '', genres: [], description: '' },
      characters: [],
      updated_at: 0,
    });

    await resolve({ storyId: 'story-1' });

    const state = TestBed.inject(WriterStateService);
    expect(state.story_id()).toBe('story-1');
    expect(state.script()).toBe('Saved text');
  });

  it('should open the new story when the url has no id', async () => {
    await resolve({});

    expect(TestBed.inject(WriterStateService).story_id()).toBe(PLACEHOLDER_STORY_ID);
  });
});
