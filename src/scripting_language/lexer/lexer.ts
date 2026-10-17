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
  console.log(src);
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

  return tokens;
}

tokenize('this is a test line\nmy character might be speaking now');
