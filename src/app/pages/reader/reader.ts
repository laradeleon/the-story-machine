import { Component, computed, signal, inject } from '@angular/core';

import { ChoiceOption } from '../../../models/story';
import { StoryService } from '../../services/story.service';

import { RouterLink } from '@angular/router';

// what the reader can be showing at any moment
type ReaderPage =
  | { kind: 'title'; title: string } // chapter title
  | { kind: 'text'; speaker: string | null; text: string } // speaker is null for prose
  | { kind: 'choice'; options: ChoiceOption[] }
  | { kind: 'end' };

@Component({
  imports: [RouterLink],
  selector: 'app-read',
  styleUrl: './reader.css',
  templateUrl: './reader.html',
})

/**
 * Reader
 *
 * The page where someone reads a story and each line shows at a time.
 *
 * It keeps track of which line of the chapter is on the screen (lineId)
 * - page works out what that line should look like (title, prose, dialogue, a choice or end) and updates whenever lineId changes
 * - next() goes to the next line when the screen is clicked
 * - goTo() goes to the specified line. its used by next() and by the choice buttons. it also skips over goto lines,
 *   since we dont actually display the content in a goto line, the reader just jumps to that line.
 *
 */
export class Reader {
  protected chapter = inject(StoryService).getFirstChapter();

  // the line being shown, if null then user is on title page of chapter (before line 0)
  private lineId = signal<number | null>(null); // a signal

  // determines the type of content (prose, dialogue....)the page should currently display based on the current line id contents
  // reruns by itself whenever a signal it reads changes (when lineId changes)
  protected page = computed((): ReaderPage => {
    const chapter = this.chapter.value(); // loaded in title and lines

    if (!chapter) {
      return { kind: 'end' };
    }

    const lineId = this.lineId();
    if (lineId === null) {
      // then show the chapter title
      return { kind: 'title', title: chapter.title };
    }

    // not null, so figure out type of content

    const line = chapter.lines[lineId];
    if (!line || 'end' in line) {
      return { kind: 'end' };
    }

    // prose
    if ('prose' in line) {
      return {
        kind: 'text',
        speaker: null,
        text: line.prose.text.words.join(' '),
      };
    }

    // dialogue has to contain speaker name
    if ('dialogue' in line) {
      return {
        kind: 'text',
        speaker: line.dialogue.name,
        text: line.dialogue.text.words.join(' '),
      };
    }

    // if choices, show them all
    if ('choice' in line) {
      return { kind: 'choice', options: line.choice };
    }
    return { kind: 'end' };
  });

  //when user clicks to go to next page, this displays the next line
  protected nextLine() {
    const lineId = this.lineId();
    if (lineId === null) {
      // if current page is chapter title page and user clicks, display first line in chapter
      this.goTo(0);
    } else {
      this.goTo(lineId + 1);
    }
  }

  // called by nextLine() when page is clicked and moves to specified line , and also by the choice buttons
  protected goTo(lineId: number) {
    const lines = this.chapter.value()?.lines ?? []; // if the chapter isn't loaded there are no lines to look at

    // most lines will get shown straight away except for a goto line, which just jumps to where it points
    // in cases where a goto line points to another goto line, just keep jumping till we land on a line that we actually do display (prose or dialogue....)
    // incase the storys gotos point at each other and get stuck in a loop, we stop jumping once its exceeded the max number of lines in this chapter
    // ie 6 -> 7 -> 6 --> 7.....
    const maxJumps = lines.length;
    for (let jumps = 0; jumps < maxJumps; jumps++) {
      const line = lines[lineId];
      // stop jumping if we're past the last line or if this line should be displayed on screen
      if (!line || !('goto_line' in line)) {
        break;
      }

      lineId = line.goto_line; // otherwise, go to this line then check what that line is the next time round the loop
    }
    this.lineId.set(lineId);
  }
}
