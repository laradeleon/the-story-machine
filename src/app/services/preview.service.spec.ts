import { TestBed } from '@angular/core/testing';
import Parser from '../../scripting_language/parser';
import { DraftService } from './draft.service';
import { PreviewService } from './preview.service';

// the key PreviewService saves the chapter under (not exported from preview.service.ts, so it's copied here)
const CHAPTER_KEY = 'story-machine:preview-chapter';

// turns a script into the AST build_preview() expects, the same way the writer does
function parse(script: string) {
  return new Parser().produceAST(script);
}

describe('PreviewService', () => {
  beforeEach(() => {
    // clear storage so every test starts the same
    localStorage.clear();
  });

  it('should have no chapter when nothing has been previewed', () => {
    expect(TestBed.inject(PreviewService).chapter()).toBeNull();
  });

  it('should build the chapter from the parsed script', () => {
    const preview = TestBed.inject(PreviewService);

    preview.build_preview(parse('Hello, world.'));

    const chapter = preview.chapter()!;
    expect(chapter.lines.length).toBeGreaterThan(0);
    expect('prose' in chapter.lines[0]).toBe(true);
  });

  it('should use the title from the metadata popup', () => {
    TestBed.inject(DraftService).metadata.set({
      title: 'The Lighthouse',
      genres: [],
      description: '',
    });
    const preview = TestBed.inject(PreviewService);

    preview.build_preview(parse('Hello, world.'));

    expect(preview.chapter()!.title).toBe('The Lighthouse');
  });

  it('should fall back to "Untitled Story" when the title is blank', () => {
    const preview = TestBed.inject(PreviewService);

    preview.build_preview(parse('Hello, world.'));

    expect(preview.chapter()!.title).toBe('Untitled Story');
  });

  it('should throw and keep the old chapter when a goto points at a missing flag', () => {
    const preview = TestBed.inject(PreviewService);
    preview.build_preview(parse('Hello, world.'));
    const before = preview.chapter();

    // the flag "nowhere" is never written, so toJSON rejects the goto
    expect(() => preview.build_preview(parse('Hello.\n-> nowhere'))).toThrow();
    expect(preview.chapter()).toBe(before);
  });

  it('should save the chapter once it changes', () => {
    const preview = TestBed.inject(PreviewService);

    preview.build_preview(parse('Hello, world.'));
    TestBed.tick(); // the save happens in an effect, so run the effects first

    expect(localStorage.getItem(CHAPTER_KEY)).not.toBeNull();
  });

  it('should restore the chapter when the service is created again', () => {
    TestBed.inject(PreviewService).build_preview(parse('Hello, world.'));
    TestBed.tick();

    // a new service is only made when the old one is thrown away, so reset TestBed first
    TestBed.resetTestingModule();

    expect(TestBed.inject(PreviewService).chapter()).not.toBeNull();
  });
});
