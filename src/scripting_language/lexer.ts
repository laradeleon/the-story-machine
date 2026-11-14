import { ErrorKind, ErrorMessageManager } from './error_message_manager.ts';

const errors = new ErrorMessageManager();

const reservedStatements: string[] = ['choice:', '->', '#', 'end']; //keep all lowercase for case insenitivity, these strings can never be used to start dialogue in multiline dialogue
//TokenType: All of the types of data that we want present in our scripting language,
//in this case we want things like characters, dialogue, prose, backgrounds, bgm, etc...
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

//a function to build multi line dialogue
function buildDialogue(
  dialogue: string,
  src: string[],
  origLineNum: number,
): { linesTraversed: number; dialogue: string } {
  //check single line dialogue

  let linesTraversed = 1;
  src.shift(); //done with the speaker line, its text is already in dialogue
  if (dialogue.endsWith('"')) {
    return { linesTraversed, dialogue };
  }

  while (true) {
    if (src.length === 0) {
      //at EOF, not good
      throw errors.format_error(ErrorKind.UnterminatedDialogue, origLineNum, ...reservedStatements);
    }

    const currentLine = src[0]; //extract current line

    if (checkReserved(currentLine) || checkDialogueStart(currentLine)) {
      //check if we encounter reserved tokens
      throw errors.format_error(ErrorKind.UnterminatedDialogue, origLineNum, ...reservedStatements);
    }

    linesTraversed++; //in both following cases we increment so do so here
    if (currentLine.endsWith('"')) {
      //at end of dialogue
      if (currentLine.length > 1) {
        dialogue += ' ' + currentLine;
      } else {
        //if we only have a closing quotation, don't add space
        dialogue += currentLine;
      }
      src.shift();
      break; //we are done with the dialogue
    }
    if (dialogue === '"') {
      //if we only have an open quote so far, dont add a space
      dialogue += currentLine;
    } else {
      dialogue += ' ' + currentLine; //build dialogue
    }
    src.shift();
  }

  return { linesTraversed, dialogue };
}

//check if the line we are reading starts with a reserved statement(defined at top of file)
function checkReserved(line: string): boolean {
  return reservedStatements.some((statement) => line.trim().toLowerCase().startsWith(statement));
}

//check if this is charcter: dialogue format
function checkDialogueStart(line: string): boolean {
  return /^([A-Za-z][A-Za-z0-9 ]*):\s*(.*)$/.test(line.trim());
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
        if (choiceSplit[0].length <= 0) {
          throw errors.format_error(ErrorKind.MissingChoiceText, lineNum);
        } else if (choiceSplit[1].length <= 0) {
          throw errors.format_error(ErrorKind.MissingChoiceDestination, lineNum);
        }
        tokens.push(token(lineNum, choiceSplit[0], TokenType.ChoiceOption));
        tokens.push(token(lineNum++, choiceSplit[1], TokenType.Goto)); //lineNum++ again
        src.shift(); //keep movin since not done in push() this time
      } //when no choices remain, continue back to start of loop to preserve lineNum
      continue;
    } else if (lowercaseLine.startsWith('#')) {
      //this line is a flag that we can jump to
      const flag_name = src.shift()?.slice(1).trim(); //remove the # and trim to be cleaner
      if (flag_name == undefined || flag_name?.length <= 0) {
        //check if we have a name
        throw errors.format_error(ErrorKind.MissingFlagName, lineNum);
      }
      tokens.push(token(lineNum, flag_name, TokenType.Flag));
    } else if (lowercaseLine == 'end') {
      //this line is an END token if the whole line is "END/end"
      tokens.push(token(lineNum, src.shift(), TokenType.End));
    } else if (lowercaseLine.startsWith('->')) {
      //this line is a standalone goto token if the line starts with '->'
      const cleaned_token = src[0].slice(2).trim();
      if (cleaned_token?.length <= 0) {
        //check if we have a destination
        throw errors.format_error(ErrorKind.MissingGotoDestination, lineNum);
      }
      tokens.push(token(lineNum, cleaned_token, TokenType.Goto));
      src.shift();
    } else if (lowercaseLine.startsWith('"')) {
      //this line is dialogue but now we need to look for the ending line.
      const dialogue = src[0]; //start the dialogue line
      const original_line_num = lineNum;
      //function to build dialogue line
      const { linesTraversed, dialogue: completeDialogue } = buildDialogue(
        dialogue,
        src,
        original_line_num,
      );
      lineNum += linesTraversed;
      tokens.push(token(original_line_num, completeDialogue, TokenType.DialogueText));
      src.shift();
    } else {
      //we want to check now that its dialogue by ensuring it follows dialogue format of: Colin: "heyo guys"
      const dialogueMatch = src[0].match(/^([A-Za-z][A-Za-z0-9 ]*):\s*(.*)$/);
      if (dialogueMatch) {
        if (dialogueMatch && !dialogueMatch[2]) {
          //no dialogue text provided, this is only a speaker switch
          //[TODO] ADD A SPEAKER SWITCH TOKEN FOR REFACTOR!!!!!!!!!!!!!!!!!!!!!
        } else {
          //we have some dialogue
          tokens.push(token(lineNum, dialogueMatch[1], TokenType.DialogueSpeaker));
          if (!dialogueMatch[2].startsWith('"')) {
            //make sure open quotations are used
            throw errors.format_error(ErrorKind.MissingOpenQuotation, lineNum);
          }

          if (!dialogueMatch[2].endsWith('"')) {
            //if the dialogue is on more than one line
            const original_line_num = lineNum;
            const { linesTraversed, dialogue: completeDialogue } = buildDialogue(
              dialogueMatch[2],
              src,
              original_line_num,
            );
            lineNum += linesTraversed;
            tokens.push(token(original_line_num, completeDialogue, TokenType.DialogueText));
            src.shift();
          } else {
            //one line dialogue
            tokens.push(token(lineNum, dialogueMatch[2], TokenType.DialogueText));
            src.shift();
          }
        }
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

const simpleStory = `Team Beluga arrives at the classroom on time for their meeting with Lauren.

Arthur: "Good morning Lauren, welcome to Interactive fiction!"
Paul: "We worked very hard on this, Adejare and I got zero sleep!"
Adejare looks at you with sleepless eyes.
Krupal: "Wake up dude.."

Choice:
Ignore the group -> end of presentation
Say goodmorning -> continue presentation
Immediately give the group an A -> The correct option

# end of presentation
The group looks worried that you are unresponsive and calls medical.
END

# continue presentation
Lara: "Thank goodness this isn’t a carpooling app am I right?"

Carsten:"We literally had that same idea Lara… We aren’t any better."

Choice:
Give team Beluga an F -> fight lara
Give team Beluga an A -> the correct option

# fight lara
Lara: "Hey! You can’t do that! I have to fight you now."
You get into a physical altercation with Lara..
You win without a scratch.
END

# the correct option
Everyone celebrates.

Colin wakes up. It was all a dream
Colin:"I worked
it was all
sas

sasd a dream"

"
all a dream
cuh
"
END
`;

//can run the file with "tsx lexer.ts" if you have tsx installed, it will tokenize the whole story we wrote and print it out
for (const token of tokenize(simpleStory)) {
  console.log(token);
}
