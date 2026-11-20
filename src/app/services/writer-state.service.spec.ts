import { TestBed } from '@angular/core/testing';
import { Draft } from '../../models/draft';
import { AssetService } from './asset.service';
import { clear_all, load_draft, load_story_assets, save_asset, save_draft } from './saved-values';
import { SAVE_DELAY, WriterStateService } from './writer-state.service';

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// IndexedDB saves are async and the effect doesn't wait for them, so give them a moment to finish
function saves_finished() {
  return wait(10);
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

  it('should open a saved story with its script, metadata and characters', async () => {
    const state = TestBed.inject(WriterStateService);
    await save_draft({
      ...draft_with_script('story-1', 'Old text'),
      metadata: { title: 'Old', genres: ['Horror'], description: 'Old' },
    });

    // the draft was saved at 0, so the backend copy is newer
    await state.open_saved_story('story-1', {
      script: 'Saved text',
      metadata: { title: 'The Lighthouse', description: 'A storm' },
      characters: [{ name: 'Dave', description: null, emotions: [] }],
      updated_at: 1000,
    });

    expect(state.story_id()).toBe('story-1');
    expect(state.script()).toBe('Saved text');
    // the backend has no genres, so the draft's are kept
    expect(state.metadata()).toEqual({
      title: 'The Lighthouse',
      genres: ['Horror'],
      description: 'A storm',
    });
    expect(state.characters()).toEqual([
      { id: expect.any(String), name: 'Dave', description: '', emotions: [] },
    ]);
  });

  it('should keep the local draft when it is newer than the saved story', async () => {
    const state = TestBed.inject(WriterStateService);
    await save_draft({
      ...draft_with_script('story-1', 'Unsaved changes'),
      metadata: { title: 'Local title', genres: [], description: '' },
      updated_at: 2000,
    });

    await state.open_saved_story('story-1', {
      script: 'Saved text',
      metadata: { title: 'The Lighthouse', description: 'A storm' },
      characters: [{ name: 'Dave', description: null, emotions: [] }],
      updated_at: 1000,
    });

    expect(state.story_id()).toBe('story-1');
    expect(state.script()).toBe('Unsaved changes');
    expect(state.metadata().title).toBe('Local title');
    expect(state.characters()).toEqual([]);
  });

  it('should use the saved story when there is no local draft', async () => {
    const state = TestBed.inject(WriterStateService);

    await state.open_saved_story('story-1', {
      script: 'Saved text',
      metadata: { title: 'The Lighthouse', description: 'A storm' },
      characters: [],
      updated_at: 0,
    });

    expect(state.script()).toBe('Saved text');
    expect(state.metadata().title).toBe('The Lighthouse');
  });

  it('should set the characters from the backend, keeping pictures of ones with the same name', async () => {
    const state = TestBed.inject(WriterStateService);
    await state.open_story('story-1');
    const image = { asset_id: 'a1', url: 'https://example.com/a1.webp' };
    state.characters.set([
      {
        id: 'c1',
        name: 'Dave',
        description: '',
        emotions: [{ id: 'e1', emotion: 'happy', image, portrait_x: 0, portrait_y: 0, zoom: 100 }],
      },
    ]);

    state.set_characters([
      {
        name: 'Dave',
        description: 'A farmer',
        emotions: [{ emotion: 'happy', portrait_x: null, portrait_y: null }],
      },
    ]);

    expect(state.characters()).toEqual([
      {
        id: 'c1',
        name: 'Dave',
        description: 'A farmer',
        emotions: [{ id: 'e1', emotion: 'happy', image, portrait_x: 0, portrait_y: 0, zoom: 100 }],
      },
    ]);
  });

  it('should not reload a story that is already open', async () => {
    const state = TestBed.inject(WriterStateService);
    await state.open_story('story-1');
    state.script.set('Not saved yet');

    await state.open_story('story-1');

    expect(state.script()).toBe('Not saved yet');
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
    await wait(SAVE_DELAY);
    await saves_finished();

    const saved = (await load_draft('story-1'))!;
    expect(saved.metadata.title).toBe('The Lighthouse');
    expect(saved.characters[0].name).toBe('Dave');
    expect(saved.updated_at).toBeGreaterThan(0);
  });

  it('should wait for the changes to stop before saving them', async () => {
    const state = TestBed.inject(WriterStateService);
    await state.open_story('story-1');

    state.characters.set([{ id: 'c1', name: 'Dave', description: '', emotions: [] }]);
    TestBed.tick();
    await saves_finished();

    expect(await load_draft('story-1')).toBeNull(); // still waiting
  });

  it('should drop the waiting save once the draft is saved straight away', async () => {
    const state = TestBed.inject(WriterStateService);
    await state.open_story('story-1');

    state.characters.set([{ id: 'c1', name: 'Dave', description: '', emotions: [] }]);
    TestBed.tick();
    await state.save_now();
    const first_save = (await load_draft('story-1'))!.updated_at;
    TestBed.tick();
    await wait(SAVE_DELAY);
    await saves_finished();

    // a second save would have a later time
    expect((await load_draft('story-1'))!.updated_at).toBe(first_save);
  });

  it('should not save anything before a story is opened', async () => {
    TestBed.inject(WriterStateService);

    TestBed.tick(); // runs the effect with the empty starting values
    await saves_finished();

    expect(await load_draft('')).toBeNull(); // '' is the id before a story is opened
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

  describe('pictures', () => {
    // opens story-1 and gives it one character with one emotion whose picture isn't uploaded yet
    async function story_with_picture() {
      const state = TestBed.inject(WriterStateService);
      await state.open_story('story-1');
      const image = await TestBed.inject(AssetService).add('story-1', new Blob(['x']));
      state.characters.set([
        {
          id: 'c1',
          name: 'Dave',
          description: '',
          emotions: [
            { id: 'e1', emotion: 'happy', image, portrait_x: 0, portrait_y: 0, zoom: 100 },
          ],
        },
      ]);
      await state.save_script_now('');
      return { state, image };
    }

    it('should show a picture that is not uploaded yet after the story is reopened', async () => {
      const { image } = await story_with_picture();

      // a reload: new services, the blob: URLs in memory are gone
      TestBed.resetTestingModule();
      await TestBed.inject(WriterStateService).open_story('story-1');

      expect(TestBed.inject(AssetService).url_of(image)!.startsWith('blob:')).toBe(true);
    });

    it('should put the Azure url in the story once the picture is uploaded', async () => {
      const { state, image } = await story_with_picture();
      const url = 'https://example.blob.core.windows.net/e1.webp';

      await state.asset_uploaded(image.asset_id, url);

      expect(state.characters()[0].emotions[0].image).toEqual({ asset_id: image.asset_id, url });
      expect((await load_draft('story-1'))!.characters[0].emotions[0].image!.url).toBe(url);
      expect(await load_story_assets('story-1')).toEqual([]); // the local copy is dropped
    });

    it('should keep the local copy when the open story does not use the picture', async () => {
      const { state, image } = await story_with_picture();
      await state.open_story('story-2'); // the writer switched stories during the upload

      await state.asset_uploaded(image.asset_id, 'https://example.blob.core.windows.net/e1.webp');

      expect(await load_story_assets('story-1')).toHaveLength(1);
      expect((await load_draft('story-1'))!.characters[0].emotions[0].image!.url).toBeNull();
    });

    it('should keep the local copy when the story with the url could not be saved', async () => {
      const { state, image } = await story_with_picture();
      vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
        throw new Error('full');
      });

      await state.asset_uploaded(image.asset_id, 'https://example.blob.core.windows.net/e1.webp');
      vi.restoreAllMocks();

      expect(await load_story_assets('story-1')).toHaveLength(1);
    });

    it('should keep the pictures when the saved draft cannot be read', async () => {
      await story_with_picture();
      await save_asset({
        asset_id: 'old',
        story_id: 'story-1',
        blob: new Blob(['x']),
        created_at: 0,
      });

      TestBed.resetTestingModule();
      vi.spyOn(IDBObjectStore.prototype, 'get').mockImplementation(() => {
        throw new Error('blocked');
      });
      await TestBed.inject(WriterStateService).open_story('story-1');
      vi.restoreAllMocks();

      expect(await load_story_assets('story-1')).toHaveLength(2);
    });

    // the stored pictures of story-1. throwing pictures away isn't waited for, so this waits a moment
    async function stored_pictures() {
      await saves_finished();
      return (await load_story_assets('story-1')).map((a) => a.asset_id);
    }

    it('should put a new picture on an emotion, save, and throw the old one away', async () => {
      const { state, image: old } = await story_with_picture();

      expect(await state.set_emotion_image('story-1', 'c1', 'e1', new Blob(['y']))).toBe(true);

      const image = state.characters()[0].emotions[0].image!;
      expect(image.asset_id).not.toBe(old.asset_id);
      expect((await load_draft('story-1'))!.characters[0].emotions[0].image).toEqual(image);
      expect(await stored_pictures()).toEqual([image.asset_id]);
    });

    it('should not store the picture when another story was opened since it was picked', async () => {
      const { state } = await story_with_picture();
      await state.open_story('story-2');

      expect(await state.set_emotion_image('story-1', 'c1', 'e1', new Blob(['y']))).toBe(false);
      expect(await load_story_assets('story-2')).toEqual([]);
    });

    it('should throw the new picture away when its emotion is gone', async () => {
      const { state, image: old } = await story_with_picture();

      expect(await state.set_emotion_image('story-1', 'c1', 'missing', new Blob(['y']))).toBe(
        false,
      );
      expect(await stored_pictures()).toEqual([old.asset_id]);
    });

    it('should throw a picture away when it is taken off its emotion', async () => {
      const { state } = await story_with_picture();

      state.remove_emotion_image('c1', 'e1');

      expect(state.characters()[0].emotions[0].image).toBeNull();
      expect(await stored_pictures()).toEqual([]);
    });

    it("should throw an emotion's picture away when the emotion is removed", async () => {
      const { state } = await story_with_picture();

      state.remove_emotion('c1', 'e1');

      expect(state.characters()[0].emotions).toEqual([]);
      expect(await stored_pictures()).toEqual([]);
    });

    it("should throw a character's pictures away when the character is removed", async () => {
      const { state } = await story_with_picture();

      state.remove_character('c1');

      expect(state.characters()).toEqual([]);
      expect(await stored_pictures()).toEqual([]);
    });

    // makes saving a draft fail, while pictures still save
    function drafts_cannot_save() {
      const put = IDBObjectStore.prototype.put;
      vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (
        this: IDBObjectStore,
        ...args: Parameters<IDBObjectStore['put']>
      ) {
        if (this.name === 'drafts') {
          throw new Error('full');
        }
        return put.apply(this, args);
      });
    }

    it('should save straight away when a picture is taken off its emotion', async () => {
      const { state } = await story_with_picture();

      state.remove_emotion_image('c1', 'e1');
      await saves_finished();

      expect((await load_draft('story-1'))!.characters[0].emotions[0].image).toBeNull();
    });

    it('should keep the picture when the draft without it could not be saved', async () => {
      const { state, image } = await story_with_picture();
      drafts_cannot_save();

      state.remove_emotion('c1', 'e1');
      const pictures = await stored_pictures();
      vi.restoreAllMocks();

      expect(pictures).toEqual([image.asset_id]);
    });

    it('should keep the old picture when the draft with the new one could not be saved', async () => {
      const { state, image: old } = await story_with_picture();
      drafts_cannot_save();

      await state.set_emotion_image('story-1', 'c1', 'e1', new Blob(['y']));
      const pictures = await stored_pictures();
      vi.restoreAllMocks();

      expect(pictures).toContain(old.asset_id);
    });
  });

  it('should save the open story before switching to another', async () => {
    const state = TestBed.inject(WriterStateService);
    await state.open_story('story-1');
    state.script.set('Unsaved change'); // not saved yet, the effect hasn't run

    await state.open_story('story-2');

    expect((await load_draft('story-1'))!.script).toBe('Unsaved change');
    expect(state.script()).toBeNull();
  });

  it('should open stories one at a time when asked to open two at once', async () => {
    const state = TestBed.inject(WriterStateService);
    await state.open_story('story-1');
    state.script.set('Unsaved change');

    await Promise.all([state.open_story('story-2'), state.open_story('story-3')]);

    expect((await load_draft('story-1'))!.script).toBe('Unsaved change');
    expect(state.story_id()).toBe('story-3');
  });
});
