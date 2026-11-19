import { TestBed } from '@angular/core/testing';
import { Draft } from '../../models/draft';
import { clear_all, load_draft, save_draft } from './saved-values';
import { PLACEHOLDER_STORY_ID, WriterStateService } from './writer-state.service';

// IndexedDB saves are async and the effect doesn't wait for them, so give them a moment to finish
function saves_finished() {
  return new Promise((resolve) => setTimeout(resolve, 10));
}

// a saved draft for a story, with only the script filled in
function draft_with_script(story_id: string, script: string): Draft {
  return {
    story_id,
    script,
    metadata: { title: '', genres: [], description: '' },
    characters: [],
    updated_at: 0,
  };
}

describe('WriterStateService', () => {
  beforeEach(async () => {
    // clear storage so every test starts the same
    await clear_all();
  });

  it('should open the placeholder story when no id is given', async () => {
    const state = TestBed.inject(WriterStateService);

    await state.open_story();

    expect(state.story_id()).toBe(PLACEHOLDER_STORY_ID);
  });

  it('should save the script straight away', async () => {
    const state = TestBed.inject(WriterStateService);
    await state.open_story('story-1');

    await state.save_script_now('Hello, world.');

    expect((await load_draft('story-1'))!.script).toBe('Hello, world.');
  });

  it('should save the metadata and characters after they change', async () => {
    const state = TestBed.inject(WriterStateService);
    await state.open_story('story-1');

    state.metadata.set({ title: 'The Lighthouse', genres: [], description: '' });
    state.characters.set([{ id: 'c1', name: 'Dave', description: '', emotions: [] }]);
    TestBed.tick(); // the save happens in an effect, so run the effects first
    await saves_finished();

    const saved = (await load_draft('story-1'))!;
    expect(saved.metadata.title).toBe('The Lighthouse');
    expect(saved.characters[0].name).toBe('Dave');
    expect(saved.updated_at).toBeGreaterThan(0);
  });

  it('should not save anything before a story is opened', async () => {
    await save_draft(draft_with_script(PLACEHOLDER_STORY_ID, 'Saved text'));
    TestBed.inject(WriterStateService);

    TestBed.tick(); // runs the effect with the empty starting values
    await saves_finished();

    expect((await load_draft(PLACEHOLDER_STORY_ID))!.script).toBe('Saved text');
  });

  it("should restore the story's saved draft", async () => {
    await save_draft(draft_with_script('story-1', 'Saved text'));
    const state = TestBed.inject(WriterStateService);

    await state.open_story('story-1');

    expect(state.script()).toBe('Saved text');
  });

  it('should start empty when the story has no draft', async () => {
    const state = TestBed.inject(WriterStateService);

    await state.open_story('story-1');

    expect(state.script()).toBeNull();
    expect(state.metadata()).toEqual({ title: '', genres: [], description: '' });
    expect(state.characters()).toEqual([]);
  });

  it('should keep each story separate', async () => {
    await save_draft(draft_with_script('story-1', 'First story'));
    await save_draft(draft_with_script('story-2', 'Second story'));
    const state = TestBed.inject(WriterStateService);

    await state.open_story('story-2');

    expect(state.script()).toBe('Second story');
  });

  it('should save the open story before switching to another', async () => {
    const state = TestBed.inject(WriterStateService);
    await state.open_story('story-1');
    state.script.set('Unsaved change'); // not saved yet, the effect hasn't run

    await state.open_story('story-2');

    expect((await load_draft('story-1'))!.script).toBe('Unsaved change');
    expect(state.script()).toBeNull();
  });
});
