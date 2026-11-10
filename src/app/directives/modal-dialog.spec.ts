import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalDialog } from './modal-dialog';

// a tiny host component so the directive has a <dialog> to sit on.
// the Close button calls modal.close() the same way the real popups do
@Component({
  imports: [ModalDialog],
  template: `
    <dialog appModal #modal="appModal" (closed)="closed_count = closed_count + 1">
      <button type="button" class="close-button" (click)="modal.close()">Close</button>
    </dialog>
  `,
})
class TestHost {
  closed_count = 0; // how many times the directive's closed output fired
}

describe('ModalDialog', () => {
  let fixture: ComponentFixture<TestHost>;
  let compiled: HTMLElement;
  let dialog: HTMLDialogElement;

  // the real showModal and close (these don't exist in the test browser, so they're undefined)
  const realShowModal = HTMLDialogElement.prototype.showModal;
  const realClose = HTMLDialogElement.prototype.close;

  beforeEach(async () => {
    // the test browser can't open or close popups, so we give it fake versions we can check
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();

    await TestBed.configureTestingModule({
      imports: [TestHost],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();
    await fixture.whenStable(); // the directive opens the dialog once it has rendered

    compiled = fixture.nativeElement as HTMLElement;
    dialog = compiled.querySelector('dialog')!;
  });

  afterEach(() => {
    // put the real ones back so the fakes don't affect other tests
    HTMLDialogElement.prototype.showModal = realShowModal;
    HTMLDialogElement.prototype.close = realClose;
  });

  it('should open as a modal when it appears', () => {
    expect(dialog.showModal).toHaveBeenCalled();
  });

  it('should not report closed just because it opened', () => {
    expect(fixture.componentInstance.closed_count).toBe(0);
  });

  it('should close when close() is called from the template', () => {
    (compiled.querySelector('.close-button') as HTMLButtonElement).click();

    expect(dialog.close).toHaveBeenCalled();
  });

  it('should emit closed when the dialog closes', () => {
    // the browser fires a "close" event whenever the popup closes (esc, a button, or close())
    dialog.dispatchEvent(new Event('close'));

    expect(fixture.componentInstance.closed_count).toBe(1);
  });
});
