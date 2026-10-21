import Parser from './parser';
import { toJSON } from './to_json.ts';

const tresspassing = `Grandpa: “You got written permission to fish here?”
Fisherman: “Huh?”
Grandpa: “Written permission from Trey Taylor.”
Fisherman: “Trey Taylor?”
Grandpa: “Crew Tractor.”
Fisherman: “Oh, Crew Tractor.”
Grandpa: “He, who, uh, who told you you could fish here?”
Fisherman: “Man, I thought it was state property.”
Grandpa: “State?”
Fisherman: “Yeah.”
Grandpa: “This?”
Fisherman: “Yeah.”
Grandpa: “State? Hit the road, dude. This ain't no state property. This is priiiivvaate prooopeeerrtyyy.”

Choice:
Accept it -> accept_it
Ask to finish your last cast -> one_more_cast

# accept_it
Fisherman: “Oh, okay.”
END

# one_more_cast
Fisherman: “Can I at least finish this last cast?”
Grandpa: “One cast.”
You cast and haul a giant catfish onto the grass.
Grandpa: “Well I'll be. Come back Saturday, and bring two rods.”
END
`;

const simpleStory = `Team Beluga arrives at the classroom on time for their meeting with Lauren.

Arthur: “Good morning Lauren, welcome to Interactive fiction!”
Paul: “We worked very hard on this, Adejare and I got zero sleep!”
Adejare looks at you with sleepless eyes.
Krupal: “Wake up dude..”

Choice:
Ignore the group -> end of presentation
Say goodmorning -> continue presentation
Immediately give the group an A -> The correct option

# end of presentation
The group looks worried that you are unresponsive and calls medical.
END


# continue presentation
Lara: “Thank goodness this isn’t a carpooling app am I right?”

Carsten:”We literally had that same idea Lara… We aren’t any better.”

Choice:
Give team Beluga an F -> fight lara
Give team Beluga an A -> the correct option

# fight lara
Lara: “Hey! You can’t do that! I have to fight you now.”
You get into a physical altercation with Lara..
You win without a scratch.
END

# the correct option 
Everyone celebrates. 

Colin wakes up. It was all a dream
END
`;

function main() {
  const parser = new Parser();

  const story1 = parser.produceAST(simpleStory);
  const story2 = parser.produceAST(tresspassing);
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
