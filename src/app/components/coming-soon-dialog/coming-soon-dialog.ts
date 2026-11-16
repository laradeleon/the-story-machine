import { Component, input, output } from '@angular/core';
import { ModalDialog } from '../../directives/modal-dialog';

// TEMPORARY: shown by buttons that don't do anything yet (Publish, Save, Characters).
// delete this component once all of them have their real functionality
@Component({
  imports: [ModalDialog],
  selector: 'app-coming-soon-dialog',
  styleUrl: './coming-soon-dialog.css',
  templateUrl: './coming-soon-dialog.html',
})
export class ComingSoonDialog {
  feature = input.required<string>(); // the name of the button that was clicked, e.g. "Publish"
  closed = output<void>(); // tells the writer the popup was closed (OK or esc)
}
