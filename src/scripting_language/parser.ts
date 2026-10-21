import {
  StoryNode,
  DialogueNode,
  ProseNode,
  ChoiceNode,
  ChoiceOptionNode,
  FlagNode,
  EndNode,
  ASTNode,
  GotoNode,
} from './ast.ts';
import { tokenize, Token, TokenType } from './lexer.ts';

export const MAX_OPTIONS = 4;

export default class Parser {
  private tokens: Token[] = [];

  //checks to see if we got to end of file
  private not_eof(): boolean {
    return this.tokens[0].type != TokenType.EOF;
  }

  private at() {
    return this.tokens[0] as Token;
  }

  //pops token at 0 off and returns it
  private pop() {
    const prev = this.tokens.shift() as Token;
    return prev;
  }

  public produceAST(sourceCode: string): StoryNode {
    this.tokens = tokenize(sourceCode);

    const story: StoryNode = {
      kind: 'StoryNode',
      body: [],
      lineNumber: 0, //default line number to start
    };

    //loop to parse till EOF
    while (this.not_eof()) {
      story.body.push(this.parse_node());
    }
    return story;
  }

  private parse_node(): ASTNode {
    const token = this.at();

    switch (token.type) {
      case TokenType.Prose:
        return this.parse_prose();

      case TokenType.DialogueSpeaker:
        return this.parse_Dialogue();

      case TokenType.ChoiceStart:
        return this.parse_choice();

      case TokenType.Flag:
        return this.parse_flag();

      case TokenType.End:
        return this.parse_end();

      case TokenType.Goto:
        return this.parse_goto();

      default:
        throw new Error(`Unexpected token '${token.value}' at line ${token.lineNumber}`);
    }
  }

  private parse_prose(): ProseNode {
    const token = this.pop();
    return { lineNumber: token.lineNumber, kind: 'ProseNode', text: token.value };
  }

  private parse_goto(): GotoNode {
    const token = this.pop();
    return { lineNumber: token.lineNumber, kind: 'GotoNode', destination: token.value };
  }

  //construct a dialogue node by popping off the speaker token and dialogue text token
  private parse_Dialogue(): DialogueNode {
    const speaker_token = this.pop(); //popped the speaker off of the array
    const dialogue_token = this.pop(); //now the actual dialogue
    return {
      lineNumber: speaker_token.lineNumber,
      kind: 'DialogueNode',
      speaker: speaker_token.value,
      text: dialogue_token.value,
    };
  }

  //construct a choice node by popping off the choice start and adding all the subsequent choice option nodes tokens to its array
  private parse_choice(): ChoiceNode {
    const choice_start_token = this.pop();
    const chioce_options: ChoiceOptionNode[] = [];
    let num_options = 0;
    //loop to parse each option we have for this specific choice
    while (this.at().type == TokenType.ChoiceOption) {
      num_options++;
      const option_token = this.pop(); //get the option information
      //check to see if we have a destination for the choice or if we have too many choices
      if (this.at().type != TokenType.Goto) {
        throw new Error(
          `Unexpected token '${this.at().value}' at line ${this.at().lineNumber}\nNo destination provided for choice option: '${option_token.value}'`,
        );
      } else if (num_options > MAX_OPTIONS) {
        throw new Error(
          `Unexpected token '${this.at().value}' at line ${this.at().lineNumber}\nToo many options, maximum of '${MAX_OPTIONS}' options per choice: '${option_token.value}'`,
        );
      }
      const option_destination = this.pop(); //get the choice destination
      chioce_options.push({
        lineNumber: option_token.lineNumber,
        kind: 'ChoiceOptionNode',
        text: option_token.value,
        destination: option_destination.value,
      });
    }
    return {
      lineNumber: choice_start_token.lineNumber,
      kind: 'ChoiceNode',
      options: chioce_options,
    };
  }

  //parse the flag our gotos will go to
  private parse_flag(): FlagNode {
    const token = this.pop();
    return { lineNumber: token.lineNumber, kind: 'FlagNode', name: token.value };
  }

  private parse_end(): EndNode {
    const token = this.pop();
    return { lineNumber: token.lineNumber, kind: 'EndNode' };
  }
}
