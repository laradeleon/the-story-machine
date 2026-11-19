import { clear_all, load, save } from './saved-values';

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

  it('should give the fallback when IndexedDB fails', async () => {
    vi.spyOn(IDBObjectStore.prototype, 'get').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(await load('key', 'fallback')).toBe('fallback');
    vi.restoreAllMocks();
  });
});
