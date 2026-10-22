import { afterNextRender, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { basicSetup } from 'codemirror';
import { EditorView } from '@codemirror/view';

//setup for writer component
@Component({
  imports: [RouterLink],
  selector: 'app-writer',
  styleUrl: './writer.css',
  templateUrl: './writer.html',
})
export class Writer {
  //init an editorview
  editorView?: EditorView;

  constructor() {
    //start render prep for the codemirror
    afterNextRender(() => {
      //get the div where the codemirror will live
      const targetElement = document.getElementById('mainwriting');

      //if the div exists, make a new CodeMirror EditorView
      if (targetElement) {
        this.editorView = new EditorView({
          //the default text in the editor, replace with chapter text when editing a chapter
          doc: 'This is CodeMirror',
          //some basic extensions for the codemirror
          extensions: [basicSetup],
          //the target in the .html
          parent: targetElement,
        });
      }
    });
  }
}
