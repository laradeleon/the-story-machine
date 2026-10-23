import Parser from '../parser';
import { toJSON } from '../to_json.ts';
import { simpleStory, tresspassing } from './stories.ts';

function main() {
  const parser1 = new Parser();
  const parser2 = new Parser();

  const story1 = parser1.produceAST(simpleStory);
  const story2 = parser2.produceAST(tresspassing);
  console.dir(story1, { depth: null });

  console.log('\nPRINTING THE SECOND STORY NOW:\n\n');

  console.dir(story2, { depth: null });

  //convert both ASTs to the reader's JSON format
  const json1 = toJSON(story1, {
    title: 'Team Beluga',
    author: 'mock-author',
    story_id: 'mock-id-1',
  });
  const json2 = toJSON(story2, {
    title: 'Tresspassing',
    author: 'mock-author',
    story_id: 'mock-id-2',
  });

  console.log('\nPRINTING THE FIRST STORY AS JSON NOW:\n\n');
  console.log(JSON.stringify(json1, null, 2));

  console.log('\nPRINTING THE SECOND STORY AS JSON NOW:\n\n');
  console.log(JSON.stringify(json2, null, 2));
}

main();
