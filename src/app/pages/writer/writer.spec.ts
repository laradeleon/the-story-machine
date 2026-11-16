import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { PreviewService } from '../../services/preview.service';
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
    // clear local storage so every test starts the same
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [Writer],
      providers: [provideRouter([])], // the back button and preview() both need a router
    }).compileComponents();

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

  it('should go to the reader when Preview is pressed with a valid script', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    set_editor_text('Hello, world.');

    button_named('Preview').click();

    expect(TestBed.inject(PreviewService).chapter()).not.toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/preview']);
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

  it('should keep the script when the writer page is closed', () => {
    set_editor_text('Keep me');

    fixture.destroy();

    expect(localStorage.getItem('story-machine:writer-script')).toBe('"Keep me"');
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
