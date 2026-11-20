import { Component, input, output, viewChild } from '@angular/core';
import { ModalDialog } from '../../directives/modal-dialog';

// a reusable "are you sure?" popup
@Component({
  imports: [ModalDialog],
  selector: 'app-confirm-dialog',
  styleUrl: './confirm-dialog.css',
  templateUrl: './confirm-dialog.html',
})
export class ConfirmDialog {
  title = input.required<string>(); // the question, e.g. "Delete this image?"
  message = input<string>(''); // extra detail under the question, optional
  confirm_label = input<string>('Confirm'); // the text on the confirm button, e.g. "Delete"

  confirmed = output<void>(); // the confirm button was pressed. the parent does the action
  closed = output<void>(); // the popup went away (Cancel, Esc or after confirming)

  private modal = viewChild.required(ModalDialog); // the popup, opened by the appModal directive

  confirm() {
    this.confirmed.emit();
    this.modal().close();
  }
}
