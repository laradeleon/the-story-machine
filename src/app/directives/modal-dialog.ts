import { afterNextRender, Directive, ElementRef, inject, output } from '@angular/core';

// shared popup behaviour, put appModal on a <dialog> to:
// - open it as a modal (blurred background, esc to close) as soon as it's on the page
// - get a (closed) event however it's closed (esc, a close button, after saving...)
// - close it from the template with a reference: <dialog appModal #modal="appModal"> ... modal.close()
@Directive({
  selector: 'dialog[appModal]',
  exportAs: 'appModal',
  host: {
    '(close)': 'closed.emit()', // the <dialog> element's own close event
  },
})
export class ModalDialog {
  closed = output<void>();

  private dialog = inject<ElementRef<HTMLDialogElement>>(ElementRef); // the <dialog> it's on

  constructor() {
    afterNextRender(() => this.dialog.nativeElement.showModal());
  }

  close() {
    this.dialog.nativeElement.close(); // fires the close event, so (closed) is emitted too
  }
}
