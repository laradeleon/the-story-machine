import { Component, input, output } from '@angular/core';
import { ModalDialog } from '../../directives/modal-dialog';

/**
 * ExitReaderDialog
 *
 * popup that asks user "are you sure?" before leaving the reader
 * triggered by either clicking exit on top left or pressing esc key
 */
@Component({
  imports: [ModalDialog],
  selector: 'app-exit-reader-dialog',
  styleUrl: './exit-reader-dialog.css',
  templateUrl: './exit-reader-dialog.html',
})
export class ExitReaderDialog {
  isPreview = input(false); // a preview goes back to the writer
  closed = output<void>(); // the popup was closed without leaving (Keep reading or esc)
  exit = output<void>(); // the reader chose to leave
}
