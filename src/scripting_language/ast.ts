// Definition of the Node types in the Abstract Syntax tree that we are going to use to pass to the Parser for JSON conversion

export type NodeType =
  | 'StoryNode'
  | 'DialogueNode'
  | 'ProseNode'
  | 'ChoiceNode'
  | 'ChoiceOptionNode'
  | 'FlagNode'
  | 'EndNode'
  | 'GotoNode';

export interface BaseNode {
  kind: NodeType;
  lineNumber: number;
}

//StoryNode is the top node encapsulating the whole story
export interface StoryNode extends BaseNode {
  kind: 'StoryNode';
  body: ASTNode[];
}

export interface DialogueNode extends BaseNode {
  kind: 'DialogueNode';
  speaker: string;
  text: string;
}

export interface ProseNode extends BaseNode {
  kind: 'ProseNode';
  text: string;
}

export interface ChoiceNode extends BaseNode {
  kind: 'ChoiceNode';
  options: ChoiceOptionNode[];
}

export interface ChoiceOptionNode extends BaseNode {
  kind: 'ChoiceOptionNode';
  text: string;
  destination: string; //text of what flag we go to
}

export interface FlagNode extends BaseNode {
  kind: 'FlagNode';
  name: string;
}

export interface EndNode extends BaseNode {
  kind: 'EndNode';
}

export interface GotoNode extends BaseNode {
  kind: 'GotoNode';
  destination: string; //name of our destination flag
}

// Union of nodes that can appear in the story body
export type ASTNode = DialogueNode | ProseNode | ChoiceNode | FlagNode | EndNode | GotoNode;
