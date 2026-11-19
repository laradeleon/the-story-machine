import { Draft } from '../../models/draft';
import { clear_all, load, load_draft, save, save_draft } from './saved-values';

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

describe('saved-values', () => {
  beforeEach(async () => {
    // clear storage so every test starts the same
    await clear_all();
  });

  it('should give back the same value after saving', async () => {
    await save('key', { title: 'The Lighthouse' });

    expect(await load('key', null)).toEqual({ title: 'The Lighthouse' });
  });

  it('should give the fallback when nothing is saved', async () => {
    expect(await load('missing', 'fallback')).toBe('fallback');
  });

  it('should remove the key when saving null', async () => {
    await save('key', 'hello');
    await save('key', null);

    expect(await load('key', 'gone')).toBe('gone');
  });

  it('should give back a saved draft by its story id', async () => {
    await save_draft(draft_with_script('story-1', 'Hello'));

    expect(await load_draft('story-1')).toEqual(draft_with_script('story-1', 'Hello'));
  });

  it('should give null for a story with no draft', async () => {
    expect(await load_draft('missing')).toBeNull();
  });

  it('should replace the old draft when the same story is saved again', async () => {
    await save_draft(draft_with_script('story-1', 'Old'));
    await save_draft(draft_with_script('story-1', 'New'));

    expect((await load_draft('story-1'))!.script).toBe('New');
  });

  it('should give the fallback when IndexedDB fails', async () => {
    vi.spyOn(IDBObjectStore.prototype, 'get').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(await load('key', 'fallback')).toBe('fallback');
    vi.restoreAllMocks();
  });
});
