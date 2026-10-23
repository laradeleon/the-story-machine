import { ChoiceOption, Line, StoryJSON } from '../../models/story.ts';

// The JSON each example story should turn into, written out by hand so it can be checked in a review.
// Read each list top to bottom next to the story: flags don't become lines, so line_ids skip nothing.

// ---------- Helpers to keep the expected lines short ----------

//splits the expected sentence into words, so write it with single spaces between words
function words(text: string) {
  return { words: text.split(' ') };
}

function prose_line(line_id: number, text: string): Line {
  return { line_id, prose: { text: words(text), text_color: null } };
}

function dialogue_line(line_id: number, name: string, text: string): Line {
  return { line_id, dialogue: { name, portrait: 'default', text: words(text), text_color: null } };
}

function option(goto_line: number, option_body: string): ChoiceOption {
  return { goto_line, option_body, condition: null };
}

function choice_line(line_id: number, options: ChoiceOption[]): Line {
  return { line_id, choice: options };
}

function end_line(line_id: number): Line {
  return { line_id, end: true };
}

// ---------- simpleStory ----------

export const simple_story_expected: StoryJSON['story'] = {
  flags: {
    'end of presentation': { line_id: 6 },
    'continue presentation': { line_id: 8 },
    'fight lara': { line_id: 11 },
    'the correct option': { line_id: 15 },
  },
  variables: [],
  lines: [
    prose_line(0, 'Team Beluga arrives at the classroom on time for their meeting with Lauren.'),
    dialogue_line(1, 'Arthur', 'Good morning Lauren, welcome to Interactive fiction!'),
    dialogue_line(2, 'Paul', 'We worked very hard on this, Adejare and I got zero sleep!'),
    prose_line(3, 'Adejare looks at you with sleepless eyes.'),
    dialogue_line(4, 'Krupal', 'Wake up dude..'),
    choice_line(5, [
      option(6, 'Ignore the group'),
      option(8, 'Say goodmorning'),
      option(15, 'Immediately give the group an A'), //"The correct option" matches regardless of case
    ]),
    // # end of presentation
    prose_line(6, 'The group looks worried that you are unresponsive and calls medical.'),
    end_line(7),
    // # continue presentation
    dialogue_line(8, 'Lara', 'Thank goodness this isn’t a carpooling app am I right?'),
    dialogue_line(9, 'Carsten', 'We literally had that same idea Lara… We aren’t any better.'),
    choice_line(10, [option(11, 'Give team Beluga an F'), option(15, 'Give team Beluga an A')]),
    // # fight lara
    dialogue_line(11, 'Lara', 'Hey! You can’t do that! I have to fight you now.'),
    prose_line(12, 'You get into a physical altercation with Lara..'),
    prose_line(13, 'You win without a scratch.'),
    end_line(14),
    // # the correct option
    prose_line(15, 'Everyone celebrates.'),
    prose_line(16, 'Colin wakes up. It was all a dream'),
    end_line(17),
  ],
};

// ---------- tresspassing ----------

export const tresspassing_expected: StoryJSON['story'] = {
  flags: {
    accept_it: { line_id: 14 },
    one_more_cast: { line_id: 16 },
  },
  variables: [],
  lines: [
    dialogue_line(0, 'Grandpa', 'You got written permission to fish here?'),
    dialogue_line(1, 'Fisherman', 'Huh?'),
    dialogue_line(2, 'Grandpa', 'Written permission from Trey Taylor.'),
    dialogue_line(3, 'Fisherman', 'Trey Taylor?'),
    dialogue_line(4, 'Grandpa', 'Crew Tractor.'),
    dialogue_line(5, 'Fisherman', 'Oh, Crew Tractor.'),
    dialogue_line(6, 'Grandpa', 'He, who, uh, who told you you could fish here?'),
    dialogue_line(7, 'Fisherman', 'Man, I thought it was state property.'),
    dialogue_line(8, 'Grandpa', 'State?'),
    dialogue_line(9, 'Fisherman', 'Yeah.'),
    dialogue_line(10, 'Grandpa', 'This?'),
    dialogue_line(11, 'Fisherman', 'Yeah.'),
    dialogue_line(
      12,
      'Grandpa',
      "State? Hit the road, dude. This ain't no state property. This is priiiivvaate prooopeeerrtyyy.",
    ),
    choice_line(13, [option(14, 'Accept it'), option(16, 'Ask to finish your last cast')]),
    // # accept_it
    dialogue_line(14, 'Fisherman', 'Oh, okay.'),
    end_line(15),
    // # one_more_cast
    dialogue_line(16, 'Fisherman', 'Can I at least finish this last cast?'),
    dialogue_line(17, 'Grandpa', 'One cast.'),
    prose_line(18, 'You cast and haul a giant catfish onto the grass.'),
    dialogue_line(19, 'Grandpa', "Well I'll be. Come back Saturday, and bring two rods."),
    end_line(20),
  ],
};
