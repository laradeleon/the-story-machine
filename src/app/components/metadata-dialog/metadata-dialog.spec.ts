import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MetadataDialog } from './metadata-dialog';

describe('MetadataDialog', () => {
  let fixture: ComponentFixture<MetadataDialog>;
  let compiled: HTMLElement;

  // the real showModal and close (these don't exist in the test browser, so they're undefined)
  const realShowModal = HTMLDialogElement.prototype.showModal;
  const realClose = HTMLDialogElement.prototype.close;

  beforeEach(async () => {
    // the test browser can't open or close popups, so we give it fake versions we can check
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();

    await TestBed.configureTestingModule({
      imports: [MetadataDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(MetadataDialog);
    fixture.componentRef.setInput('metadata', { title: '', genres: [], description: '' });
    fixture.detectChanges();
    await fixture.whenStable();
    compiled = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    // put the real ones back so the fakes don't affect other tests
    HTMLDialogElement.prototype.showModal = realShowModal;
    HTMLDialogElement.prototype.close = realClose;
  });

  // types into the title box, description box, etc. the same way a writer would
  function type_title(value: string) {
    (compiled.querySelector('#metadata-title') as HTMLInputElement).value = value;
  }

  function type_description(value: string) {
    (compiled.querySelector('textarea') as HTMLTextAreaElement).value = value;
  }

  // presses Save (the form's submit)
  function press_save() {
    compiled.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
  }

  it('should show the current title and description in the boxes', async () => {
    fixture.componentRef.setInput('metadata', {
      title: 'The Lighthouse',
      genres: [],
      description: 'A keeper and a storm',
    });
    fixture.detectChanges();
    await fixture.whenStable();

    const title = compiled.querySelector('#metadata-title') as HTMLInputElement;
    const description = compiled.querySelector('textarea') as HTMLTextAreaElement;
    expect(title.value).toBe('The Lighthouse');
    expect(description.value).toBe('A keeper and a storm');
  });

  it('should send the title and description when Save is pressed', () => {
    const onSaved = vi.fn();
    fixture.componentInstance.saved.subscribe(onSaved);

    type_title('The Lighthouse');
    type_description('A keeper and a storm');
    press_save();

    expect(onSaved).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'The Lighthouse',
        description: 'A keeper and a storm',
      }),
    );
  });

  it('should remove spaces around the title and description', () => {
    const onSaved = vi.fn();
    fixture.componentInstance.saved.subscribe(onSaved);

    type_title('   The Lighthouse  ');
    type_description('\n  A keeper and a storm \n');
    press_save();

    expect(onSaved).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'The Lighthouse',
        description: 'A keeper and a storm',
      }),
    );
  });

  it('should close the popup after Save', () => {
    type_title('The Lighthouse');
    press_save();

    expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();
  });

  it('should not send anything when Cancel is pressed', () => {
    const onSaved = vi.fn();
    fixture.componentInstance.saved.subscribe(onSaved);

    type_title('The Lighthouse');
    (compiled.querySelector('.cancel-button') as HTMLButtonElement).click();

    expect(onSaved).not.toHaveBeenCalled();
  });

  // TODO: genres. Test how "fantasy, mystery" is split into a list (and empty ones dropped)
  // once we decide how genres should be organised
});
