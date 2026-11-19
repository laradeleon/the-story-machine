import { TestBed } from '@angular/core/testing';
import { clear_all, load, save } from './saved-values';
import { WriterStateService } from './writer-state.service';

// the keys WriterStateService saves under (not exported from writer-state.service.ts, so they're copied here)
const SCRIPT_KEY = 'story-machine:writer-script';
const METADATA_KEY = 'story-machine:writer-metadata';

// IndexedDB saves are async and the effects don't wait for them, so give them a moment to finish
function saves_finished() {
  return new Promise((resolve) => setTimeout(resolve, 10));
}

describe('WriterStateService', () => {
  beforeEach(async () => {
    // clear storage so every test starts the same
    await clear_all();
  });

  it('should save the script straight away', async () => {
    const state = TestBed.inject(WriterStateService);

    await state.save_script_now('Hello, world.');

    expect(await load(SCRIPT_KEY, null)).toBe('Hello, world.');
  });

  it('should save the metadata after it changes', async () => {
    const state = TestBed.inject(WriterStateService);
    await state.restore();

    state.metadata.set({ title: 'The Lighthouse', genres: [], description: '' });
    TestBed.tick(); // the save happens in an effect, so run the effects first
    await saves_finished();

    expect((await load(METADATA_KEY, { title: '' })).title).toBe('The Lighthouse');
  });

  it('should not save anything before the saved values are restored', async () => {
    await save(SCRIPT_KEY, 'Saved text');
    TestBed.inject(WriterStateService);

    TestBed.tick(); // runs the effects with the empty starting values
    await saves_finished();

    expect(await load(SCRIPT_KEY, null)).toBe('Saved text');
  });

  it('should restore the saved script', async () => {
    await save(SCRIPT_KEY, 'Saved text');
    const state = TestBed.inject(WriterStateService);

    await state.restore();

    expect(state.script()).toBe('Saved text');
  });

  it('should use the default metadata when nothing is saved', async () => {
    const state = TestBed.inject(WriterStateService);

    await state.restore();

    expect(state.metadata()).toEqual({ title: '', genres: [], description: '' });
  });

  it('should start with no characters', () => {
    expect(TestBed.inject(WriterStateService).characters()).toEqual([]);
  });
});
