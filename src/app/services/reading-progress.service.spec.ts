import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ReadingProgressService } from './reading-progress.service';
import { AuthService } from './auth.service';
import { GUEST_USER, User } from '../../models/auth';

// two signed in readers to check their progress is kept apart from each other and from guests
const ada: User = { ...GUEST_USER, _id: 'ada-id', username: 'ada' };
const bola: User = { ...GUEST_USER, _id: 'bola-id', username: 'bola' };

describe('ReadingProgressService', () => {
  let progress: ReadingProgressService;
  const currentUser = signal<User>(GUEST_USER); // whos signed in

  beforeEach(() => {
    localStorage.clear();
    currentUser.set(GUEST_USER); // start signed out
    TestBed.configureTestingModule({
      // a fake auth service to change whos signed in
      providers: [{ provide: AuthService, useValue: { currentUser } }],
    });
    progress = TestBed.inject(ReadingProgressService);
  });

  afterEach(() => localStorage.clear());

  // a story nobody has opened yet should open from the beginning
  it("has nothing saved for a story that hasn't been started", () => {
    expect(progress.get('s1')).toBeNull();
  });

  // save where they are then read it back
  it('gives back the position that was saved', () => {
    progress.save('s1', { chapterIndex: 1, lineId: 4 }); // chapter 2, line 4
    expect(progress.get('s1')).toEqual({ chapterIndex: 1, lineId: 4 });
  });

  // reading one story shouldnt move your place in another one
  it("keeps each story's position separate", () => {
    progress.save('s1', { chapterIndex: 1, lineId: 4 });
    progress.save('s2', { chapterIndex: 0, lineId: null }); // chapter title

    expect(progress.get('s1')).toEqual({ chapterIndex: 1, lineId: 4 });
    expect(progress.get('s2')).toEqual({ chapterIndex: 0, lineId: null });
  });

  // people sharing a computer each get their own place in the story
  it("keeps each reader's progress separate, including guests", () => {
    // the guest and ada are both partway through s1, at different lines
    progress.save('s1', { chapterIndex: 0, lineId: 1 }); // as a guest
    currentUser.set(ada);
    progress.save('s1', { chapterIndex: 0, lineId: 2 });

    // bola hasn't opened s1, so ada's and the guest's progress shouldn't show up for them
    currentUser.set(bola);
    expect(progress.get('s1')).toBeNull();

    // switching back to ada and to the guest gives each of them their own line again
    currentUser.set(ada);
    expect(progress.get('s1')).toEqual({ chapterIndex: 0, lineId: 2 });
    currentUser.set(GUEST_USER);
    expect(progress.get('s1')).toEqual({ chapterIndex: 0, lineId: 1 });
  });

  // finishing a story clears it which shouldn't lose their place in other stories
  it('clearing a story only forgets that story', () => {
    progress.save('s1', { chapterIndex: 1, lineId: 4 });
    progress.save('s2', { chapterIndex: 0, lineId: 3 });

    progress.clear('s1');

    expect(progress.get('s1')).toBeNull();
    expect(progress.get('s2')).toEqual({ chapterIndex: 0, lineId: 3 });
  });

  // as progress is saved in localStorage, it can be edited outside the app in dev tools
  // so handle any potentially garbage data thats being saved there
  // anything of the sort is treated "not started" instead of crashing
  it("ignores saved data it can't use, instead of breaking the reader", () => {
    // s1 has a chapter before the first one, s2 has a line that isn't a number
    localStorage.setItem(
      'tsm_reading_progress_guest',
      JSON.stringify({ s1: { chapterIndex: -1, lineId: 2 }, s2: { chapterIndex: 0, lineId: 'x' } }),
    );
    expect(progress.get('s1')).toBeNull();
    expect(progress.get('s2')).toBeNull();

    // and something that isn't a list of stories at all
    localStorage.setItem('tsm_reading_progress_guest', 'null');
    expect(progress.get('s1')).toBeNull();
  });

  // the landing page's continue reading list
  it('lists the stories this reader has started', () => {
    progress.save('s1', { chapterIndex: 0, lineId: 2 });
    progress.save('s2', { chapterIndex: 1, lineId: null });
    expect(progress.inProgressStoryIds()).toHaveLength(2);

    // starting over (or finishing) clears a story, so it drops off the list
    progress.clear('s1');
    expect(progress.inProgressStoryIds()).toEqual(['s2']);
  });

  // story that the user read most recently goes first (furthest left)
  describe('order', () => {
    // fake clock to set the time
    beforeEach(() => vi.useFakeTimers({ toFake: ['Date'] }));
    afterEach(() => vi.useRealTimers());

    it('puts the most recently read story first', () => {
      vi.setSystemTime(1000);
      progress.save('s1', { chapterIndex: 0, lineId: 2 });
      vi.setSystemTime(2000);
      progress.save('s2', { chapterIndex: 0, lineId: 5 });
      vi.setSystemTime(3000);
      progress.save('s3', { chapterIndex: 1, lineId: 0 });

      expect(progress.inProgressStoryIds()).toEqual(['s3', 's2', 's1']);
    });

    // going back to an older story (every page turn saves) should move it back to the front
    it('moves a story to the front when it is read again', () => {
      vi.setSystemTime(1000);
      progress.save('s1', { chapterIndex: 0, lineId: 2 });
      vi.setSystemTime(2000);
      progress.save('s2', { chapterIndex: 0, lineId: 5 });
      vi.setSystemTime(3000);
      progress.save('s1', { chapterIndex: 0, lineId: 3 }); // turned a page in s1

      expect(progress.inProgressStoryIds()).toEqual(['s1', 's2']);
    });

    // a time that's missing or broken shouldn't hide the story, it just goes last in the last
    it('puts a story with no read time last', () => {
      localStorage.setItem(
        'tsm_reading_progress_guest',
        JSON.stringify({
          s1: { chapterIndex: 0, lineId: 2 }, // no lastReadAt
          s2: { chapterIndex: 0, lineId: 5, lastReadAt: 2000 },
        }),
      );
      expect(progress.inProgressStoryIds()).toEqual(['s2', 's1']);
    });
  });

  // another reader's stories shouldn't show up in your list
  it("only lists the signed in reader's stories", () => {
    progress.save('s1', { chapterIndex: 0, lineId: 2 }); // as a guest
    currentUser.set(ada);
    expect(progress.inProgressStoryIds()).toEqual([]);
  });

  //positions that can't be used to put the user back in the same spot they left off are skipped instead of showing a story that won't open properly
  it("leaves out saved positions it can't use", () => {
    localStorage.setItem(
      'tsm_reading_progress_guest',
      JSON.stringify({ s1: { chapterIndex: 0, lineId: 2 }, s2: { chapterIndex: 'x', lineId: 0 } }),
    );
    expect(progress.inProgressStoryIds()).toEqual(['s1']);
  });
});
