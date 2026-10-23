// example stories written in the scripting language
// used by test_parser.ts to print them, and by the integration tests to check them
//------------------------------------------stories for sprint 1 -------------------

export const tresspassing = `Grandpa: "You got written permission to fish here?"
Fisherman: "Huh?"
Grandpa: "Written permission from Trey Taylor."
Fisherman: "Trey Taylor?"
Grandpa: "Crew Tractor."
Fisherman: "Oh, Crew Tractor."
Grandpa: "He, who, uh, who told you you could fish here?"
Fisherman: "Man, I thought it was state property."
Grandpa: "State?"
Fisherman: "Yeah."
Grandpa: "This?"
Fisherman: "Yeah."
Grandpa: "State? Hit the road, dude. This ain't no state property. This is priiiivvaate prooopeeerrtyyy."

Choice:
Accept it -> accept_it
Ask to finish your last cast -> one_more_cast

# accept_it
Fisherman: "Oh, okay."
END

# one_more_cast
Fisherman: "Can I at least finish this last cast?"
Grandpa: "One cast."
You cast and haul a giant catfish onto the grass.
Grandpa: "Well I'll be. Come back Saturday, and bring two rods."
END
`;

export const simpleStory = `Team Beluga arrives at the classroom on time for their meeting with Lauren.

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

Carsten:“We literally had that same idea Lara… We aren’t any better.”

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
