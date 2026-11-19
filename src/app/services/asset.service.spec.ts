import { TestBed } from '@angular/core/testing';
import { AssetService } from './asset.service';
import { clear_all, load_story_assets, save_asset } from './saved-values';

// a small picture file, like one the writer picked
function picture() {
  return new Blob(['x'], { type: 'image/png' });
}

describe('AssetService', () => {
  let assets: AssetService;

  beforeEach(async () => {
    // clear storage so every test starts the same
    await clear_all();
    assets = TestBed.inject(AssetService);
  });

  it('should give a new picture a reference with no url yet', async () => {
    const image = await assets.add('story-1', picture());

    expect(image).toEqual({ asset_id: expect.any(String), url: null });
  });

  it('should show a new picture from a local blob: URL', async () => {
    const image = await assets.add('story-1', picture());

    expect(assets.url_of(image)!.startsWith('blob:')).toBe(true);
  });

  it('should save a new picture in IndexedDB under its story', async () => {
    const image = await assets.add('story-1', picture());

    const saved = await load_story_assets('story-1');
    expect(saved.map((a) => a.asset_id)).toEqual([image.asset_id]);
    expect(saved[0].blob.type).toBe('image/png');
  });

  it('should show an uploaded picture from its Azure url', () => {
    const image = { asset_id: 'a1', url: 'https://example.blob.core.windows.net/a1.webp' };

    expect(assets.url_of(image)).toBe(image.url);
  });

  it('should give null when there is no picture', () => {
    expect(assets.url_of(null)).toBeNull();
  });

  it('should give null for a picture whose local copy is gone', () => {
    expect(assets.url_of({ asset_id: 'missing', url: null })).toBeNull();
  });

  it('should show the local copy again after the story is reopened', async () => {
    const image = await assets.add('story-1', picture());

    // a new service is like a page reload: the blob: URLs in memory are gone
    TestBed.resetTestingModule();
    const reloaded = TestBed.inject(AssetService);
    await reloaded.restore('story-1', new Set([image.asset_id]));

    expect(reloaded.url_of(image)!.startsWith('blob:')).toBe(true);
  });

  it('should throw away old pictures the story no longer uses when it is reopened', async () => {
    const kept = await assets.add('story-1', picture());
    // e.g. deleted or replaced two days ago
    await save_asset({ asset_id: 'old', story_id: 'story-1', blob: picture(), created_at: 0 });

    await assets.restore('story-1', new Set([kept.asset_id]));

    expect((await load_story_assets('story-1')).map((a) => a.asset_id)).toEqual([kept.asset_id]);
    expect(assets.url_of({ asset_id: 'old', url: null })).toBeNull();
  });

  it('should keep a new picture the saved draft does not use yet', async () => {
    // e.g. added just before a reload, before the draft pointing at it was saved
    const image = await assets.add('story-1', picture());

    await assets.restore('story-1', new Set());

    expect(await load_story_assets('story-1')).toHaveLength(1);
    expect(assets.url_of(image)!.startsWith('blob:')).toBe(true);
  });

  it('should keep every picture when it is not known which ones the story uses', async () => {
    await save_asset({ asset_id: 'old', story_id: 'story-1', blob: picture(), created_at: 0 });

    await assets.restore('story-1', null);

    expect(await load_story_assets('story-1')).toHaveLength(1);
  });

  it('should still show a picture IndexedDB could not save, but say it is unsaved', async () => {
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
      throw new Error('full');
    });

    const image = await assets.add('story-1', picture());
    vi.restoreAllMocks();

    expect(assets.url_of(image)!.startsWith('blob:')).toBe(true);
    expect(assets.is_unsaved(image)).toBe(true);
  });

  it('should not call a saved picture unsaved', async () => {
    expect(assets.is_unsaved(await assets.add('story-1', picture()))).toBe(false);
  });

  it('should throw away a picture straight away when it is forgotten', async () => {
    const image = await assets.add('story-1', picture());

    await assets.forget(image.asset_id);

    expect(assets.url_of(image)).toBeNull();
    expect(await load_story_assets('story-1')).toEqual([]);
  });
  // uploaded() just calls forget(); WriterStateService's 'should put the Azure url in the story
  // once the picture is uploaded' checks the local copy is dropped after an upload
});
