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

  it('should say a draft was saved', async () => {
    expect(await save_draft(draft_with_script('story-1', 'Hello'))).toBe(true);
  });

  it('should say a draft was not saved when IndexedDB fails', async () => {
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
      throw new Error('full');
    });

    expect(await save_draft(draft_with_script('story-1', 'Hello'))).toBe(false);
    vi.restoreAllMocks();
  });

  it('should throw when a draft cannot be read, instead of saying there is none', async () => {
    vi.spyOn(IDBObjectStore.prototype, 'get').mockImplementation(() => {
      throw new Error('blocked');
    });

    await expect(load_draft('story-1')).rejects.toThrow();
    vi.restoreAllMocks();
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

  it('should let a newer version of the app in another tab open the database', async () => {
    await save('key', 'hello'); // this "tab" has the database open

    // another tab with a higher DB_VERSION. it can only open once this tab lets go
    const newer = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('story-machine', 99);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    newer.close();

    // this tab's version is now too old, so it falls back instead of hanging
    expect(await load('key', 'fallback')).toBe('fallback');

    // put the database back to how the other tests expect it
    await new Promise((resolve) => (indexedDB.deleteDatabase('story-machine').onsuccess = resolve));
  });
});
