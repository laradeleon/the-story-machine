import { TestBed } from '@angular/core/testing';
import { DraftService } from './draft.service';

// the keys DraftService saves under (not exported from draft.service.ts, so they're copied here)
const SCRIPT_KEY = 'story-machine:writer-script';
const METADATA_KEY = 'story-machine:writer-metadata';

describe('DraftService', () => {
  beforeEach(() => {
    // clear storage so every test starts the same
    localStorage.clear();
  });

  it('should save the script straight away', () => {
    const draft = TestBed.inject(DraftService);

    draft.save_script_now('Hello, world.');

    expect(localStorage.getItem(SCRIPT_KEY)).toBe('"Hello, world."');
  });

  it('should save the metadata after it changes', () => {
    const draft = TestBed.inject(DraftService);

    draft.metadata.set({ title: 'The Lighthouse', genres: [], description: '' });
    TestBed.tick(); // the save happens in an effect, so run the effects first

    expect(JSON.parse(localStorage.getItem(METADATA_KEY)!).title).toBe('The Lighthouse');
  });

  it('should restore the script when the service is created again', () => {
    localStorage.setItem(SCRIPT_KEY, '"Saved text"');

    // a new service is only made when the old one is thrown away, so reset TestBed first
    TestBed.resetTestingModule();

    expect(TestBed.inject(DraftService).script()).toBe('Saved text');
  });

  it('should use the default metadata when nothing is saved', () => {
    expect(TestBed.inject(DraftService).metadata()).toEqual({
      title: '',
      genres: [],
      description: '',
    });
  });
});
