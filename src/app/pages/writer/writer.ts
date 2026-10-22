import { afterNextRender, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { basicSetup } from 'codemirror';
import { EditorView } from '@codemirror/view';

@Component({
  imports: [RouterLink],
  selector: 'app-writer',
  styleUrl: './writer.css',
  templateUrl: './writer.html',
})
export class Writer {
  editorView?: EditorView;

  constructor() {
    afterNextRender(() => {
      const targetElement = document.getElementById('mainwriting');

      if (targetElement) {
        this.editorView = new EditorView({
          doc: 'This is CodeMirror',
          extensions: [basicSetup],
          parent: targetElement,
        });
      }
    });
  }
}
