import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { clear_all, load_draft } from '../../services/saved-values';
import { PreviewService } from '../../services/preview.service';
import { WriterStateService } from '../../services/writer-state.service';
import { StoryService } from '../../services/story.service';
import { HttpErrorResponse } from '@angular/common/http';
import { AUTH_MESSAGES } from '../../../models/auth-messages';
import { Writer } from './writer';
import { ErrorKind, ErrorMessageManager } from '../../../scripting_language/error_message_manager';

const errors = new ErrorMessageManager();

describe('Writer', () => {
  let component: Writer;
  let fixture: ComponentFixture<Writer>;

  // finds a button on the page by the text it shows, e.g. "Flag" or "Preview"
  function button_named(name: string): HTMLButtonElement {
    return Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (button) => (button as HTMLButtonElement).textContent?.trim() === name,
    ) as HTMLButtonElement;
  }

  // replaces everything in the editor with this text, like the writer typing it
  function set_editor_text(text: string) {
    const view = component.editorView!;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
  }

  // the text currently in the editor
  function editor_text(): string {
    return component.editorView!.state.doc.toString();
  }

  beforeEach(async () => {
    // clear saved values so every test starts the same
    await clear_all();

    await TestBed.configureTestingModule({
      imports: [Writer],
      providers: [provideRouter([])], // the back button and preview() both need a router
    }).compileComponents();

    // the /write/:storyId route opens the story before the writer page is made
    await TestBed.inject(WriterStateService).open_story('story-1');

    fixture = TestBed.createComponent(Writer);
    component = fixture.componentInstance;
    fixture.detectChanges(); // the editor is made once the page has rendered
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should add a flag where the cursor is when Flag is pressed', () => {
    set_editor_text('');

    button_named('Flag').click();

    expect(editor_text()).toBe('# [put your flag name here]');
  });

  it('should add a goto and an end when Goto and End are pressed', () => {
    set_editor_text('');

    button_named('Goto').click();
    button_named('End').click();

    expect(editor_text()).toContain('-> [flag name]');
    expect(editor_text()).toContain('END');
  });

  it('should add a choice with the number of options that was pressed', () => {
    set_editor_text('');

    // the numbers next to "Choice" are 1 to 4, so the second button adds 2 options
    (
      fixture.nativeElement.querySelectorAll('.choice-count-button')[1] as HTMLButtonElement
    ).click();

    expect(editor_text()).toBe(
      'Choice:\n[option 1 text] -> [flag name]\n[option 2 text] -> [flag name]',
    );
  });

  it('should open the metadata popup when Metadata is pressed', () => {
    button_named('Metadata').click();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('app-metadata-dialog'))).not.toBeNull();
  });

  it('should open the characters popup when Characters is pressed', () => {
    button_named('Characters').click();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('app-characters-dialog'))).not.toBeNull();
  });

  it('should go to the reader when Preview is pressed with a valid script', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    set_editor_text('Hello, world.');

    button_named('Preview').click();

    expect(TestBed.inject(PreviewService).chapter()).not.toBeNull();
    // the story id lets the reader's Back to writing return to this story
    expect(navigate).toHaveBeenCalledWith(['/preview', 'story-1']);
  });

  it('should show the error and stay on the writer when Preview is pressed with a mistake', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    // the goto points at a flag that doesn't exist, so the preview can't be built
    set_editor_text('Hello.\n-> nowhere');

    button_named('Preview').click();
    fixture.detectChanges();

    expect(navigate).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.preview-error').textContent).toContain(
      errors.format_error(ErrorKind.FlagDoesNotExist, 2).message,
    );
  });

  it('should hide the error once the script parses again', () => {
    // stub the navigation, since the test browser has no /preview route to go to
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    set_editor_text('Hello.\n-> nowhere');
    button_named('Preview').click();

    set_editor_text('Hello, world.');
    button_named('Preview').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.preview-error')).toBeNull();
  });

  it('should keep the script when the writer page is closed', async () => {
    set_editor_text('Keep me');

    fixture.destroy();
    await new Promise((resolve) => setTimeout(resolve, 10)); // the IndexedDB save is async

    expect((await load_draft('story-1'))?.script).toBe('Keep me');
  });

  describe('saving to the backend', () => {
    // the real showModal (doesn't exist in the test browser), the error popup opens with it
    const realShowModal = HTMLDialogElement.prototype.showModal;

    beforeEach(() => {
      HTMLDialogElement.prototype.showModal = vi.fn();
    });

    afterEach(() => {
      HTMLDialogElement.prototype.showModal = realShowModal;
    });

    // lets save_draft() or publish() finish after its faked requests, then shows the result
    async function settle() {
      await new Promise((resolve) => setTimeout(resolve));
      await fixture.whenStable();
    }

    function status_message() {
      return fixture.nativeElement.querySelector('.status-message')?.textContent ?? null;
    }

    function error_popup(): HTMLElement | null {
      return fixture.nativeElement.querySelector('app-error-dialog');
    }

    function script_problem() {
      return fixture.nativeElement.querySelector('.preview-error')?.textContent ?? null;
    }

    // fakes every request Save Draft and Publish make, so each test only changes the one it's about
    function fake_backend() {
      const stories = TestBed.inject(StoryService);
      return {
        patch: vi.spyOn(stories, 'update_story').mockResolvedValue({} as never),
        upload: vi.spyOn(stories, 'upload_script').mockResolvedValue(),
        chapter: vi.spyOn(stories, 'save_chapter').mockResolvedValue(),
      };
    }

    function set_title(title: string) {
      TestBed.inject(WriterStateService).metadata.set({ title, genres: [], description: '' });
    }

    it('Save Draft should send the metadata and characters, then upload the script', async () => {
      const stories = TestBed.inject(StoryService);
      const patch = vi.spyOn(stories, 'update_story').mockResolvedValue({} as never);
      const upload = vi.spyOn(stories, 'upload_script').mockResolvedValue();
      const state = TestBed.inject(WriterStateService);
      state.metadata.set({ title: 'The Lighthouse', genres: ['Horror'], description: 'A storm' });
      state.characters.set([{ id: 'c1', name: 'Dave', description: '', emotions: [] }]);
      set_editor_text('Hello, world.');

      button_named('Save Draft').click();
      fixture.detectChanges();
      expect(button_named('Saving...').disabled).toBe(true);
      await settle();

      expect(patch).toHaveBeenCalledWith('story-1', {
        title: 'The Lighthouse',
        description: 'A storm',
        characters: [{ name: 'Dave', description: null, emotions: [] }],
      });
      expect(upload).toHaveBeenCalledWith('story-1', 'Hello, world.');
      expect(status_message()).toContain('Draft saved.');
      expect(button_named('Save Draft').disabled).toBe(false);
    });

    it('Save Draft should leave out a blank title, since the backend needs one', async () => {
      const { patch } = fake_backend();

      button_named('Save Draft').click();
      await settle();

      expect(patch.mock.calls[0][1]).not.toHaveProperty('title');
    });

    it('Save Draft should show the error in a popup and not upload the script if the save fails', async () => {
      const { patch, upload } = fake_backend();
      patch.mockRejectedValue(new Error('Server Error'));

      button_named('Save Draft').click();
      await settle();

      expect(upload).not.toHaveBeenCalled();
      expect(error_popup()?.textContent).toContain("Couldn't save the draft");
      expect(status_message()).toBeNull();
      expect(button_named('Save Draft').disabled).toBe(false);
    });

    it('Publish should save the draft and the chapter, then publish the story', async () => {
      const { patch, upload, chapter } = fake_backend();
      set_title('The Lighthouse');
      set_editor_text('Hello, world.');

      button_named('Publish').click();
      fixture.detectChanges();
      expect(button_named('Publishing...').disabled).toBe(true);
      expect(button_named('Save Draft').disabled).toBe(true); // can't save while publishing
      await settle();

      expect(patch.mock.calls[0][1]).toMatchObject({ title: 'The Lighthouse' }); // the draft
      expect(upload).toHaveBeenCalledWith('story-1', 'Hello, world.');
      expect(chapter).toHaveBeenCalledWith(
        'story-1',
        expect.objectContaining({ lines: [expect.objectContaining({ prose: expect.anything() })] }),
      );
      // published last, after the chapter is saved
      expect(patch).toHaveBeenLastCalledWith('story-1', { status: 'published' });
      expect(chapter.mock.invocationCallOrder[0]).toBeLessThan(
        patch.mock.invocationCallOrder.at(-1)!,
      );
      expect(status_message()).toContain('Story published.');
    });

    it("Publish should show a friendly message, not the server's, when the backend crashes", async () => {
      const { patch } = fake_backend();
      patch.mockRejectedValue(
        new HttpErrorResponse({ status: 500, error: { message: 'Internal server error' } }),
      );
      set_title('The Lighthouse');
      set_editor_text('Hello, world.');

      button_named('Publish').click();
      await settle();

      expect(error_popup()?.textContent).toContain(AUTH_MESSAGES.unknownError);
      expect(error_popup()?.textContent).not.toContain('Internal server error');
    });

    it('should not start Save Draft while Publish is running, even when called directly', async () => {
      const { patch } = fake_backend();
      set_title('The Lighthouse');
      set_editor_text('Hello, world.');

      button_named('Publish').click();
      // like a keyboard shortcut would, skipping the disabled button
      (component as unknown as { save_draft: () => Promise<void> }).save_draft();
      await settle();

      // only Publish's two PATCHes (the draft, then the status), none from Save Draft
      expect(patch).toHaveBeenCalledTimes(2);
      expect(status_message()).toContain('Story published.');
    });

    it('Publish should ask for a title and save nothing without one', async () => {
      const { patch } = fake_backend();
      set_editor_text('Hello, world.');

      button_named('Publish').click();
      await settle();

      expect(script_problem()).toContain('Give the story a title');
      expect(patch).not.toHaveBeenCalled();
    });

    it('Publish should show a mistake in the script like Preview does and save nothing', async () => {
      const { patch, chapter } = fake_backend();
      set_title('The Lighthouse');
      // the goto points at a flag that doesn't exist, so toJSON throws
      set_editor_text('Hello.\n-> nowhere');

      button_named('Publish').click();
      await settle();

      expect(script_problem()).toContain(
        errors.format_error(ErrorKind.FlagDoesNotExist, 2).message,
      );
      expect(error_popup()).toBeNull(); // the popup is only for backend problems
      expect(patch).not.toHaveBeenCalled();
      expect(chapter).not.toHaveBeenCalled();
    });

    it('Publish should not publish an empty story', async () => {
      const { patch } = fake_backend();
      set_title('The Lighthouse');
      set_editor_text('');

      button_named('Publish').click();
      await settle();

      expect(script_problem()).toContain('Write the story before publishing it.');
      expect(patch).not.toHaveBeenCalled();
    });

    it("Publish should show the backend's reason in a popup and not publish if the chapter is turned away", async () => {
      const { patch, chapter } = fake_backend();
      chapter.mockRejectedValue(
        new HttpErrorResponse({
          status: 400,
          error: { success: false, message: 'Dialogue uses a character that is not in the story' },
        }),
      );
      set_title('The Lighthouse');
      set_editor_text('Hello, world.');

      button_named('Publish').click();
      await settle();

      expect(error_popup()?.textContent).toContain("Couldn't publish the story");
      expect(error_popup()?.textContent).toContain(
        'Dialogue uses a character that is not in the story',
      );
      expect(patch).not.toHaveBeenCalledWith('story-1', { status: 'published' });
      expect(button_named('Publish').disabled).toBe(false);
    });
  });

  it('should show the parser output when AST is pressed with a valid script', () => {
    set_editor_text('Hello, world.');

    button_named('AST').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.ast-output').textContent).toContain(
      '"kind": "StoryNode"',
    );
  });

  it('should show the parser error and no AST when AST is pressed with a syntax mistake', () => {
    // a flag with no name is a syntax mistake, so the parser throws
    set_editor_text('#');

    button_named('AST').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.ast-output')).toBeNull();
    expect(fixture.nativeElement.querySelector('.preview-error').textContent).toContain(
      errors.format_error(ErrorKind.MissingFlagName, 1).message,
    );
  });
});
