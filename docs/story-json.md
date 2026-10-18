# Story Script JSON

This follows the "Parser to reader" section of our planning notes.

---

## 1. Shape

Each story would have five fields at the top level: `title`, `author` and `story_id` say which story it is, `characters` would list all characters in the story and then `story` would hold the story content itself.

| Part                          | What it is                                                                                                                                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `title`, `author`, `story_id` | Which story this is and who wrote it. The reader shows the title and author on the first page.                                                                                                         |
| `characters`                  | All the characters in the story, with their emotions. Dialogue lines refer to these by name.                                                                                                           |
| `story`                       | The story itself. It's just a box holding the three things below, grouped together the way the planning notes grouped them.                                                                            |
| `story.lines`                 | **The actual story content in order.** Every sentence, choice and background change in the order they appear in the story. The reader would walk through this list from the top.                       |
| `story.flags`                 | Bookmarks: a name for a place in `lines`, like "Morning starts at `line_id` 15".                                                                                                                       |
| `story.variables`             | For a later feature where the story remembers things, like "the cat is dead" and only shows some choices if they're true. Always `[]` for now as this is not something we're implementing this sprint. |

See [section 4](#4-full-example) for a complete story.

```json
{
  "title": "The Lion at the Door",
  "author": "username",
  "story_id": "6650f1c2a1b2c3d4e5f60718",
  "characters": {
    "Dave": {
      "name": "Dave",
      "description": null,
      "emotions": [
        { "emotion": "default", "portrait_x": null, "portrait_y": null },
        { "emotion": "thinking", "portrait_x": null, "portrait_y": null },
        { "emotion": "angry", "portrait_x": null, "portrait_y": null }
      ]
    }
  },
  "story": {
    "flags": {
      "Morning": { "line_id": 15 }
    },
    "variables": [],
    "lines": [
      {
        "line_id": 0,
        "prose": { "text": { "words": ["The", "fire", "had", "burned", "down", "to", "embers."] }, "text_color": null }
      }
    ]
  }
}
```

Portraits and text colour are null as that would be in a future sprint.

---

## 2. Entries in `lines`

These are the kinds of entries that can be in `lines`: `dialogue`, `prose`, `choice`, `background`, `goto_line` and `end`.

Every entry also has a `line_id`: its position in `lines`, starting from 0. `goto_line` and `flags` point to these numbers, so you can always see where a jump goes.

### `dialogue`

```json
{
  "line_id": 9,
  "dialogue": {
    "name": "Dave",
    "portrait": "angry",
    "text": { "words": ["Whatever", "you", "are,", "leave", "us", "alone!"] },
    "text_color": null
  }
}
```

`name` would be a key into `characters`. `portrait` is the name of one of that character's emotions. It's `"default"` when an emotion hasnt been set yet.

### `prose`

```json
{ "line_id": 3, "prose": { "text": { "words": ["He", "pulled", "his", "coat", "tighter."] }, "text_color": null } }
```

### `choice`

```json
{
  "line_id": 7,
  "choice": [
    { "goto_line": 8, "option_body": "Open the door", "condition": null },
    { "goto_line": 12, "option_body": "Hide under the table", "condition": null }
  ]
}
```

### `background`

```json
{ "line_id": 8, "background": "cabin-door.jpg" }
```

### `goto_line`

```json
{ "line_id": 11, "goto_line": 15 }
```

### `end`

```json
{ "line_id": 17, "end": true }
```

---

## 3. How the reader would play it

Start at `lines[0]` with no background, then depending on what the type is:

| Entry        | What the reader does                                                                          |
| ------------ | --------------------------------------------------------------------------------------------- |
| `prose`      | Show `words` joined with spaces and wait for a click or Space/Enter, then go to the next line. |
| `dialogue`   | Show `name`, the portrait and `words` joined with spaces, and wait. Then go to the next line. |
| `choice`     | Show each `option_body` and wait for one to be picked, then go to that option's `goto_line`.  |
| `background` | Change the background and go straight to the next line without waiting.                       |
| `goto_line`  | Go straight to that line without waiting.                                                     |
| `end`        | Show the ending screen.                                                                       |

Going past the last line also shows the ending screen.

---

## 4. Full example

This is a complete story and written out as the JSON the reader would receive.

```json
{
  "title": "The Lion at the Door",
  "author": "mock-author",
  "story_id": "6650f1c2a1b2c3d4e5f60718",
  "characters": {
    "Dave": {
      "name": "Dave",
      "description": null,
      "emotions": [
        {
          "emotion": "default",
          "portrait_x": null,
          "portrait_y": null
        },
        {
          "emotion": "thinking",
          "portrait_x": null,
          "portrait_y": null
        },
        {
          "emotion": "angry",
          "portrait_x": null,
          "portrait_y": null
        },
        {
          "emotion": "happy",
          "portrait_x": null,
          "portrait_y": null
        }
      ]
    },
    "Cindy": {
      "name": "Cindy",
      "description": null,
      "emotions": [
        {
          "emotion": "default",
          "portrait_x": null,
          "portrait_y": null
        },
        {
          "emotion": "thinking",
          "portrait_x": null,
          "portrait_y": null
        },
        {
          "emotion": "worried",
          "portrait_x": null,
          "portrait_y": null
        }
      ]
    }
  },
  "story": {
    "flags": {
      "Face the lion": {
        "line_id": 8
      },
      "Hide": {
        "line_id": 12
      },
      "Morning": {
        "line_id": 15
      }
    },
    "variables": [],
    "lines": [
      {
        "line_id": 0,
        "background": "cabin-interior.jpg"
      },
      {
        "line_id": 1,
        "prose": {
          "text": {
            "words": ["The", "fire", "had", "burned", "down", "to", "embers."]
          },
          "text_color": null
        }
      },
      {
        "line_id": 2,
        "dialogue": {
          "name": "Dave",
          "portrait": "default",
          "text": {
            "words": ["I'm", "in", "a", "cabin", "in", "the", "woods."]
          },
          "text_color": null
        }
      },
      {
        "line_id": 3,
        "prose": {
          "text": {
            "words": ["He", "pulled", "his", "coat", "tighter."]
          },
          "text_color": null
        }
      },
      {
        "line_id": 4,
        "dialogue": {
          "name": "Dave",
          "portrait": "default",
          "text": {
            "words": ["And", "I'm", "fairly", "sure", "I'm", "in", "danger."]
          },
          "text_color": null
        }
      },
      {
        "line_id": 5,
        "dialogue": {
          "name": "Cindy",
          "portrait": "worried",
          "text": {
            "words": ["Did", "you", "hear", "that?"]
          },
          "text_color": null
        }
      },
      {
        "line_id": 6,
        "prose": {
          "text": {
            "words": ["Something", "heavy", "scraped", "against", "the", "door."]
          },
          "text_color": null
        }
      },
      {
        "line_id": 7,
        "choice": [
          {
            "goto_line": 8,
            "option_body": "Open the door",
            "condition": null
          },
          {
            "goto_line": 12,
            "option_body": "Hide under the table",
            "condition": null
          }
        ]
      },
      {
        "line_id": 8,
        "background": "cabin-door.jpg"
      },
      {
        "line_id": 9,
        "dialogue": {
          "name": "Dave",
          "portrait": "angry",
          "text": {
            "words": ["Whatever", "you", "are,", "leave", "us", "alone!"]
          },
          "text_color": null
        }
      },
      {
        "line_id": 10,
        "prose": {
          "text": {
            "words": ["The", "lion", "blinked,", "then", "went", "back", "into", "the", "trees."]
          },
          "text_color": null
        }
      },
      {
        "line_id": 11,
        "goto_line": 15
      },
      {
        "line_id": 12,
        "dialogue": {
          "name": "Cindy",
          "portrait": "default",
          "text": {
            "words": ["Don't.", "Make.", "A.", "Sound."]
          },
          "text_color": null
        }
      },
      {
        "line_id": 13,
        "prose": {
          "text": {
            "words": ["They", "waited", "until", "the", "scraping", "stopped."]
          },
          "text_color": null
        }
      },
      {
        "line_id": 14,
        "goto_line": 15
      },
      {
        "line_id": 15,
        "background": "forest-morning.jpg"
      },
      {
        "line_id": 16,
        "dialogue": {
          "name": "Dave",
          "portrait": "happy",
          "text": {
            "words": ["We", "made", "it."]
          },
          "text_color": null
        }
      },
      {
        "line_id": 17,
        "end": true
      }
    ]
  }
}
```

### What the reader sees

Reading it top to bottom would look like the following (note: Click would just go to next line):

| `line_id` | Entry                                 | On screen                                                                                       |
| --------- | ------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 0         | `background`                          | Background becomes `cabin-interior.jpg`. Dont need to click to show.                            |
| 1         | `prose`                               | "The fire had burned down to embers." _Click._                                                  |
| 2         | `dialogue`, Dave, portrait "default"  | **Dave:** "I'm in a cabin in the woods." _Click._                                               |
| 3         | `prose`                               | "He pulled his coat tighter." _Click._                                                          |
| 4         | `dialogue`, Dave, portrait "default"  | **Dave:** "And I'm fairly sure I'm in danger." _Click._                                         |
| 5         | `dialogue`, Cindy, portrait "worried" | **Cindy:** "Did you hear that?" _Click._                                                        |
| 6         | `prose`                               | "Something heavy scraped against the door." _Click._                                            |
| 7         | `choice`                              | Two buttons: **Open the door** (-> `line_id` 8) and **Hide under the table** (-> `line_id` 12). |

**If the reader picks "Open the door":**

| `line_id` | Entry                              | On screen                                                  |
| --------- | ---------------------------------- | ---------------------------------------------------------- |
| 8         | `background`                       | Background becomes `cabin-door.jpg`.                       |
| 9         | `dialogue`, Dave, portrait "angry" | **Dave:** "Whatever you are, leave us alone!" _Click._     |
| 10        | `prose`                            | "The lion blinked then went back into the trees." _Click._ |
| 11        | `goto_line: 15`                    | Jumps to `line_id` 15. No click needed.                    |

**If the reader picks "Hide under the table":**

| `line_id` | Entry                                 | On screen                                          |
| --------- | ------------------------------------- | -------------------------------------------------- |
| 12        | `dialogue`, Cindy, portrait "default" | **Cindy:** "Don't. Make. A. Sound." _Click._       |
| 13        | `prose`                               | "They waited until the scraping stopped." _Click._ |
| 14        | `goto_line: 15`                       | Jumps to `line_id` 15. No click needed.            |

**Both paths end the same way:**

| `line_id` | Entry                              | On screen                                        |
| --------- | ---------------------------------- | ------------------------------------------------ |
| 15        | `background`                       | Background becomes `forest-morning.jpg`.         |
| 16        | `dialogue`, Dave, portrait "happy" | **Dave:** "We made it." _Click._                 |
| 17        | `end`                              | Ending screen: "The Lion at the Door" by author. |
