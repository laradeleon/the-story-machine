// takes an AST from the parser and converts it to JSON
import { StoryNode } from './ast.ts';
import { StoryInfo, StoryJSON, Text } from '../models/story.ts';

// ---------- Main function ----------

export function toJSON(story: StoryNode, info: StoryInfo): StoryJSON {
  // TODO step 1: work out which line_id each flag points to (see find_flags)
  // why first? a choice can jump to a flag further down the story
  const flags: Map<string, number> = find_flags(story);

  const result: StoryJSON = {
    ...info,
    characters: {}, //placeholder for now
    story: {
      flags: {},
      variables: [], //placeholder for now
      lines: [],
    },
  };

  //sets the flags
  for (const [name, line_id] of flags) {
    result.story.flags[name] = { line_id: line_id };
  }

  //goes through each node, and creates the appropriate JSON Structure.
  for (const node of story.body) {
    switch (node.kind) {
      case 'ProseNode':
        result.story.lines.push({
          line_id: result.story.lines.length,
          prose: {
            text: to_text(node.text),
            text_color: null,
          },
        });
        break;

      case 'DialogueNode':
        result.story.lines.push({
          line_id: result.story.lines.length,
          dialogue: {
            name: node.speaker,
            portrait: 'default',
            text: to_text(node.text),
            text_color: null,
          },
        });
        break;

      case 'EndNode':
        result.story.lines.push({
          line_id: result.story.lines.length,
          end: true,
        });
        break;

      case 'ChoiceNode':
        result.story.lines.push({
          line_id: result.story.lines.length,
          choice: node.options.map((option) => ({
            goto_line: resolve_flag(flags, option.destination, option.lineNumber),
            option_body: option.text,
            condition: null,
          })),
        });
        break;

      case 'GotoNode':
        result.story.lines.push({
          line_id: result.story.lines.length,
          goto_line: resolve_flag(flags, node.destination, node.lineNumber),
        });
        break;
    }
  }

  return result;
}

// ---------- Helpers ----------

//returns flag name -> line_id of the line right after the flag
function find_flags(story: StoryNode): Map<string, number> {
  const flags = new Map<string, number>();

  let count = 0;

  for (const node of story.body) {
    if (node.kind == 'FlagNode') {
      //flags can share names
      const name = node.name.toLowerCase();

      //check for duplicate names of flags
      if (flags.has(name)) {
        throw new Error('Flag already exists on line: ' + node.lineNumber);
      }

      flags.set(name, count);
    } else {
      count++;
    }
  }
  return flags;
}

//turns a choice destination (a flag name) into the line_id it jumps to
function resolve_flag(flags: Map<string, number>, destination: string, lineNumber: number): number {
  const result = flags.get(destination.toLowerCase());

  if (result === undefined) {
    throw new Error('Flag does not exist for goto on line: ' + lineNumber);
  }

  return result;
}

//turns a line of text into { words: [...] }
function to_text(text: string): Text {
  //removes one quote mark  from each edge
  const unquoted = text.trim().replace(/^["“”]|["“”]$/g, '');

  //split on any run of whitespace, and drop empty strings so extra spaces don't create "" words
  const words = unquoted.split(/\s+/).filter((word) => word !== '');

  return { words: words };
}
