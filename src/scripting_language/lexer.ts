//TokenType: All of the types of data that we watn present in our scripting language,
//in this case we want things like characters, dialogue, prose, backgorunds, bgm, etc...
export enum TokenType {
  ChoiceStart, //denoted by "Choice:" ignore case, up to 4 choices
  ChoiceOption,
  DialogueSpeaker,
  DialogueText,
  Prose,
  Goto,
  Flag, // denoted by "#"
  End,
  EOF,
}

export interface Token {
  lineNumber: number;
  value: string;
  type: TokenType;
}

function token(lineNumber: number, value = '', type: TokenType): Token {
  return { lineNumber, value, type };
}

export function tokenize(sourceCode: string): Token[] {
  const tokens = new Array<Token>();
  const src = sourceCode.split('\n'); //split on newline so we get the source code line by line
  let lineNum = 1;
  //loop to tokenize each line
  while (src.length > 0) {
    if (!src[0].trim()) {
      //use .trim() to remove leading and trailing whitespace.
      src.shift();
      lineNum++; //going to next line
      continue; //skips the empty line and restarts loop
    }
    if (!src[0]) {
      src.shift();
      lineNum++; //going to next line
      continue; //skips the empty line and restarts loop
    }

    const lowercaseLine = src[0].toLowerCase(); //make sure we are case insensitive

    if (lowercaseLine.startsWith('choice:')) {
      //this line is the start of a choice selection
      tokens.push(token(lineNum++, src.shift(), TokenType.ChoiceStart)); //need lineNum++ since we evaluate choices next and linenumber will not be accurate without updating
      //Now we loop to get each option for this choice
      while (src.length > 0 && src[0].includes('->')) {
        //if the line has a goto, we know it's a choice option, we add the option and the Goto token right after
        const choiceSplit = src[0].split('->').map((str) => str.trim()); //split the choice text and goto token
        tokens.push(token(lineNum, choiceSplit[0], TokenType.ChoiceOption));
        tokens.push(token(lineNum++, choiceSplit[1], TokenType.Goto)); //lineNum++ again
        src.shift(); //keep movin since not done in push() this time
      } //when no choices remain, continue back to start of loop to preserve lineNum
      continue;
    } else if (lowercaseLine.startsWith('#')) {
      //this line is a flag that we can jump to
      tokens.push(token(lineNum, src.shift()?.slice(1).trim(), TokenType.Flag)); //remove the # and trim to be cleaner
    } else if (lowercaseLine == 'end') {
      //this line is an END token if the whole line is "END/end"
      tokens.push(token(lineNum, src.shift(), TokenType.End));
    } else {
      //we want to check now that its dialogue by ensuring it follows dialogue format of: Colin: "heyo guys"
      const dialogueMatch = src[0].match(/^([A-Za-z][A-Za-z0-9 ]*):\s*(.*)$/);
      if (dialogueMatch) {
        tokens.push(token(lineNum, dialogueMatch[1], TokenType.DialogueSpeaker));
        tokens.push(token(lineNum, dialogueMatch[2], TokenType.DialogueText));
        src.shift();
      } else {
        //if all checks fail, then the line MUST be prose
        tokens.push(token(lineNum, src.shift(), TokenType.Prose));
      }
    }

    lineNum++; //going to next line
  }
  tokens.push(token(lineNum, 'EndOfFile', TokenType.EOF));
  return tokens;
}

// const simpleStory = `Team Beluga arrives at the classroom on time for their meeting with Lauren.

// Arthur: “Good morning Lauren, welcome to Interactive fiction!”
// Paul: “We worked very hard on this, Adejare and I got zero sleep!”
// Adejare looks at you with sleepless eyes.
// Krupal: “Wake up dude..”

// Choice:
// Ignore the group -> end of presentation
// Say goodmorning -> continue presentation
// Immediately give the group an A -> The correct option

// # end of presentation
// The group looks worried that you are unresponsive and calls medical.
// END

// # continue presentation
// Lara: “Thank goodness this isn’t a carpooling app am I right?”

// Carsten:”We literally had that same idea Lara… We aren’t any better.”

// Choice:
// Give team Beluga an F -> fight lara
// Give team Beluga an A -> the correct option

// # fight lara
// Lara: “Hey! You can’t do that! I have to fight you now.”
// You get into a physical altercation with Lara..
// You win without a scratch.
// END

// # the correct option
// Everyone celebrates.

// Colin wakes up. It was all a dream
// END
// `;

//can run the file with "tsx lexer.ts" if you have tsx installed, it will tokenize the whole story we wrote and print it out
// for (const token of tokenize(simpleStory)) {
//   console.log(token);
// }
