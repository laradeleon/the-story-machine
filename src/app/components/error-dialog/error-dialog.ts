import { Component, input, output } from '@angular/core';
import { ModalDialog } from '../../directives/modal-dialog';

// tells the writer something went wrong talking to the backend, e.g. a save or publish that failed.
// mistakes in the script are shown under the editor instead
@Component({
  imports: [ModalDialog],
  selector: 'app-error-dialog',
  styleUrl: './error-dialog.css',
  templateUrl: './error-dialog.html',
})
export class ErrorDialog {
  title = input.required<string>(); // what went wrong, e.g. "Couldn't publish"
  message = input.required<string>(); // more detail, and what to do about it
  closed = output<void>(); // tells the page the popup was closed (OK or esc)
}
