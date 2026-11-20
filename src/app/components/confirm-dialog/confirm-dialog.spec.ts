import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmDialog } from './confirm-dialog';

describe('ConfirmDialog', () => {
  let fixture: ComponentFixture<ConfirmDialog>;
  let compiled: HTMLElement;

  // the real showModal and close (these don't exist in the test browser, so they're undefined)
  const realShowModal = HTMLDialogElement.prototype.showModal;
  const realClose = HTMLDialogElement.prototype.close;

  beforeEach(async () => {
    // the test browser can't open or close popups, so we give it fake versions we can check
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();

    await TestBed.configureTestingModule({
      imports: [ConfirmDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialog);
    fixture.componentRef.setInput('title', 'Delete this image?');
    fixture.componentRef.setInput('message', 'This cannot be undone.');
    fixture.componentRef.setInput('confirm_label', 'Delete');
    fixture.detectChanges();
    await fixture.whenStable();
    compiled = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    // put the real ones back so the fakes don't affect other tests
    HTMLDialogElement.prototype.showModal = realShowModal;
    HTMLDialogElement.prototype.close = realClose;
  });

  // finds a button by the words on it
  function button_named(text: string): HTMLButtonElement {
    return Array.from(compiled.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === text,
    )!;
  }

  it('should show the question, the detail and the confirm label', () => {
    expect(compiled.querySelector('h2')!.textContent).toContain('Delete this image?');
    expect(compiled.textContent).toContain('This cannot be undone.');
    expect(button_named('Delete')).toBeDefined();
  });

  it('should emit confirmed and close when the confirm button is pressed', () => {
    const onConfirmed = vi.fn();
    fixture.componentInstance.confirmed.subscribe(onConfirmed);

    button_named('Delete').click();

    expect(onConfirmed).toHaveBeenCalledTimes(1);
    expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();
  });

  it('should not emit confirmed when Cancel is pressed', () => {
    const onConfirmed = vi.fn();
    fixture.componentInstance.confirmed.subscribe(onConfirmed);

    button_named('Cancel').click();

    expect(onConfirmed).not.toHaveBeenCalled();
  });
});
