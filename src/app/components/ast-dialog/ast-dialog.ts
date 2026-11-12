import { Component, input, output } from '@angular/core';
import { ModalDialog } from '../../directives/modal-dialog';

// shows the parser's AST (the story structure it builds before it's turned into JSON),
// opened by the AST button on the writer page. useful for checking how a script was read
@Component({
  imports: [ModalDialog],
  selector: 'app-ast-dialog',
  styleUrl: './ast-dialog.css',
  templateUrl: './ast-dialog.html',
})
export class AstDialog {
  ast = input.required<string>(); // the AST already formatted as text by the writer
  closed = output<void>(); // tells the writer the popup was closed (Close or esc)
}
