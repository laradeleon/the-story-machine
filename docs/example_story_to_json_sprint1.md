# Sample Story

This is a sample story for sprint 1 for testing purposes to include and demonstrate the following utilities:

- prose (descriptions and text, any text that a character might say)
- dialogue (with temporary character names)
- choices
- flags
- chapters
- ending a story

#### Example Input

```
Team Beluga arrives at the classroom on time for their meeting with Lauren.

Arthur: “Good morning Lauren, welcome to Interactive fiction!”
Paul: “We worked very hard on this, Adejare and I got zero sleep!”
Adejare looks at you with sleepless eyes.
Krupal: “Wake up dude..”

Choice:
Ignore the group -> end_of_presentation
Say goodmorning -> continue_presentation
Immediately give the group an A -> The correct option

# end of presentation
The group looks worried that you are unresponsive and calls medical.
END OF STORY
fin


# continue_presentation
Lara: “Thank goodness this isn’t a carpooling app am I right?”

Carsten:”We literally had that same idea Lara… We aren’t any better.”

Choice:
Give team Beluga an F -> fight_lara
Give team Beluga an A -> the correct option

# fight_lara
Lara: “Hey! You can’t do that! I have to fight you now.”
You get into a physical altercation with Lara..
You win without a scratch.
END

# the correct option
Everyone celebrates.

Colin wakes up. It was all a dream
END
```

#### Example Output

```JSON
{
  "title": "Team Beluga's Presentation",
  "author": "Team Beluga",
  "story_id": "000000000000000000000000",
  "chapter_id": "000000000000000000000001",
  "chapter_name": "Chapter 1",
  "story": {
    "flags": {
      "end_of_presentation": {
        "line_id": 5
      },
      "continue_presentation": {
        "line_id": 7
      },
      "fight_lara": {
        "line_id": 10
      },
      "the_correct_option": {
        "line_id": 14
      }
    },
    "variables": [],
    "lines": [
      {
        "line_id": 0,
        "dialogue": {
          "name": "Arthur",
          "text": {
            "words": [
              "Good",
              "morning",
              "Lauren,",
              "welcome",
              "to",
              "Interactive",
              "fiction!"
            ]
          }
        }
      },
      {
        "line_id": 1,
        "dialogue": {
          "name": "Paul",
          "text": {
            "words": [
              "We",
              "worked",
              "very",
              "hard",
              "on",
              "this,",
              "Adejare",
              "and",
              "I",
              "got",
              "zero",
              "sleep!"
            ]
          }
        }
      },
      {
        "line_id": 2,
        "prose": {
          "text": {
            "words": [
              "Adejare",
              "looks",
              "at",
              "you",
              "with",
              "sleepless",
              "eyes."
            ]
          }
        }
      },
      {
        "line_id": 3,
        "dialogue": {
          "name": "Krupal",
          "text": {
            "words": [
              "Wake",
              "up",
              "dude.."
            ]
          }
        }
      },
      {
        "line_id": 4,
        "choice": [
          {
            "goto_line": 5,
            "option_body": "Ignore the group",
            "condition": null
          },
          {
            "goto_line": 7,
            "option_body": "Say goodmorning",
            "condition": null
          },
          {
            "goto_line": 14,
            "option_body": "Immediately give the group an A",
            "condition": null
          }
        ]
      },
      {
        "line_id": 5,
        "prose": {
          "text": {
            "words": [
              "The",
              "group",
              "looks",
              "worried",
              "that",
              "you",
              "are",
              "unresponsive",
              "and",
              "calls",
              "medical."
            ]
          }
        }
      },
      {
        "line_id": 6,
        "end": true
      },
      {
        "line_id": 7,
        "dialogue": {
          "name": "Lara",
          "text": {
            "words": [
              "Thank",
              "goodness",
              "this",
              "isn't",
              "a",
              "carpooling",
              "app",
              "am",
              "I",
              "right?"
            ]
          }
        }
      },
      {
        "line_id": 8,
        "dialogue": {
          "name": "Carsten",
          "text": {
            "words": [
              "We",
              "literally",
              "had",
              "that",
              "same",
              "idea",
              "Lara…",
              "We",
              "aren't",
              "any",
              "better."
            ]
          }
        }
      },
      {
        "line_id": 9,
        "choice": [
          {
            "goto_line": 10,
            "option_body": "Give team Beluga an F",
            "condition": null
          },
          {
            "goto_line": 14,
            "option_body": "Give team Beluga an A",
            "condition": null
          }
        ]
      },
      {
        "line_id": 10,
        "dialogue": {
          "name": "Lara",
          "text": {
            "words": [
              "Hey!",
              "You",
              "can't",
              "do",
              "that!",
              "I",
              "have",
              "to",
              "fight",
              "you",
              "now."
            ]
          }
        }
      },
      {
        "line_id": 11,
        "prose": {
          "text": {
            "words": [
              "You",
              "get",
              "into",
              "a",
              "physical",
              "altercation",
              "with",
              "Lara.."
            ]
          }
        }
      },
      {
        "line_id": 12,
        "prose": {
          "text": {
            "words": [
              "You",
              "win",
              "without",
              "a",
              "scratch."
            ]
          }
        }
      },
      {
        "line_id": 13,
        "end": true
      },
      {
        "line_id": 14,
        "prose": {
          "text": {
            "words": [
              "Everyone",
              "celebrates."
            ]
          }
        }
      },
      {
        "line_id": 15,
        "prose": {
          "text": {
            "words": [
              "Colin",
              "wakes",
              "up.",
              "It",
              "was",
              "all",
              "a",
              "dream"
            ]
          }
        }
      },
      {
        "line_id": 16,
        "end": true
      }
    ]
  }
}

```
