import { afterNextRender, Component, ElementRef, input, output, viewChild } from '@angular/core';

// TEMPORARY: shown by buttons that don't do anything yet (Publish, Save, Characters).
// delete this component once all of them have their real functionality
@Component({
  selector: 'app-coming-soon-dialog',
  styleUrl: './coming-soon-dialog.css',
  templateUrl: './coming-soon-dialog.html',
})
export class ComingSoonDialog {
  feature = input.required<string>(); // the name of the button that was clicked, e.g. "Publish"
  closed = output<void>(); // tells the writer the popup was closed (OK or esc)

  protected dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog'); // popup

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal()); // open as soon as it's on the page
  }
}
