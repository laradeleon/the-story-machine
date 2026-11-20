import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ErrorDialog } from './error-dialog';

describe('ErrorDialog', () => {
  let fixture: ComponentFixture<ErrorDialog>;
  let compiled: HTMLElement;

  // the real showModal and close (these don't exist in the test browser, so they're undefined)
  const realShowModal = HTMLDialogElement.prototype.showModal;
  const realClose = HTMLDialogElement.prototype.close;

  beforeEach(async () => {
    // the test browser can't open or close popups, so we give it fake versions we can check
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();

    await TestBed.configureTestingModule({
      imports: [ErrorDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(ErrorDialog);
    fixture.componentRef.setInput('title', "Couldn't publish");
    fixture.componentRef.setInput('message', 'Please try again.');
    fixture.detectChanges();
    await fixture.whenStable();
    compiled = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    // put the real ones back so the fakes don't affect other tests
    HTMLDialogElement.prototype.showModal = realShowModal;
    HTMLDialogElement.prototype.close = realClose;
  });

  it('should open as a popup showing the title and message', () => {
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
    expect(compiled.querySelector('h2')!.textContent).toContain("Couldn't publish");
    expect(compiled.textContent).toContain('Please try again.');
  });

  it('should close when OK is pressed', () => {
    (compiled.querySelector('.error-actions button') as HTMLButtonElement).click();

    expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();
  });
});
