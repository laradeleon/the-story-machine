import { Character, Emotion } from '../../../models/story';
import { default_placement } from '../image-editor/placement';
import {
  character_problems,
  duplicated_keys,
  name_key,
  new_character,
  new_emotion,
  next_name,
  placement_fields,
  placement_of,
  unapproved_characters,
} from './characters-rules';

// a character with the given name and emotion names, for building lists to test with
function character(name: string, emotions: string[] = []): Character {
  return {
    id: name,
    name,
    description: '',
    emotions: emotions.map((emotion, i) => ({
      id: `${name}-${i}`,
      emotion,
      image_url: null,
      portrait_x: 0,
      portrait_y: 0,
      zoom: 100,
    })),
  };
}

function emotion(name: string): Emotion {
  return { id: name, emotion: name, image_url: null, portrait_x: 0, portrait_y: 0, zoom: 100 };
}

describe('characters rules', () => {
  describe('name_key', () => {
    it('ignores capitals and spaces at the ends', () => {
      expect(name_key('  Dave Smith ')).toBe('dave smith');
    });
  });

  describe('duplicated_keys', () => {
    it('finds names used more than once, ignoring capitals and spaces', () => {
      expect([...duplicated_keys(['Dave', 'dave ', 'Sam'])]).toEqual(['dave']);
    });

    it('is empty when every name is different', () => {
      expect(duplicated_keys(['Dave', 'Sam']).size).toBe(0);
    });

    it('lists each duplicated name once, however many times it repeats', () => {
      expect(duplicated_keys(['a', 'A', 'a']).size).toBe(1);
    });
  });

  describe('next_name', () => {
    it('starts at 1 when nothing is taken', () => {
      expect(next_name('Emotion', [])).toBe('Emotion 1');
    });

    it('uses the first free number, not the next after the last', () => {
      expect(next_name('Character', ['Character 1', 'Character 3'])).toBe('Character 2');
    });

    it('ignores capitals when checking what is taken', () => {
      expect(next_name('Emotion', ['EMOTION 1'])).toBe('Emotion 2');
    });
  });

  describe('new_character', () => {
    it('is called "Character 1" in an empty list, with no description or emotions', () => {
      const created = new_character([]);

      expect(created).toMatchObject({ name: 'Character 1', description: '', emotions: [] });
      expect(created.id).not.toBe('');
    });

    it('takes the first free name after a removal', () => {
      const created = new_character([character('Character 2')]);

      expect(created.name).toBe('Character 1');
    });

    it('gives each new character its own id', () => {
      expect(new_character([]).id).not.toBe(new_character([]).id);
    });
  });

  describe('new_emotion', () => {
    it('is called "Emotion 1" then "Emotion 2", centred at 100% with no picture', () => {
      const first = new_emotion([]);
      const second = new_emotion([first]);

      expect(first).toMatchObject({
        emotion: 'Emotion 1',
        image_url: null,
        portrait_x: 0,
        portrait_y: 0,
        zoom: 100,
      });
      expect(second.emotion).toBe('Emotion 2');
    });
  });

  describe('placement', () => {
    it('reads an emotion as the image editor placement', () => {
      const placed = { ...emotion('happy'), portrait_x: 10, portrait_y: -5, zoom: 150 };

      expect(placement_of(placed)).toEqual({ x: 10, y: -5, zoom: 150 });
    });

    it('gives the default placement when there is no emotion', () => {
      expect(placement_of(undefined)).toEqual(default_placement);
    });

    it('writes a placement back as the emotion fields used in the JSON', () => {
      expect(placement_fields({ x: 1, y: 2, zoom: 3 })).toEqual({
        portrait_x: 1,
        portrait_y: 2,
        zoom: 3,
      });
    });
  });

  describe('character_problems', () => {
    it('has no problems when names are unique and filled in', () => {
      expect(character_problems([character('Dave', ['happy']), character('Sam', ['sad'])])).toEqual(
        [],
      );
    });

    it('reports a character with no name', () => {
      expect(character_problems([character('   ')])).toContain('A character has no name.');
    });

    it('reports characters that share a name', () => {
      expect(character_problems([character('Dave'), character('dave')])).toContain(
        'Two or more characters share a name.',
      );
    });

    it('reports an emotion with no name', () => {
      expect(character_problems([character('Dave', [' '])])).toContain(
        'An emotion has no name, or a character has two emotions with the same name.',
      );
    });

    it('reports two emotions in one character that share a name', () => {
      expect(character_problems([character('Dave', ['happy', 'Happy'])])).toContain(
        'An emotion has no name, or a character has two emotions with the same name.',
      );
    });

    it('allows the same emotion name in two different characters', () => {
      expect(
        character_problems([character('Dave', ['happy']), character('Sam', ['happy'])]),
      ).toEqual([]);
    });

    it('lists every problem, not just the first', () => {
      const problems = character_problems([character(''), character('Dave'), character('Dave')]);

      expect(problems).toHaveLength(2);
    });
  });

  describe('unapproved_characters', () => {
    it('does not check anything yet', () => {
      expect(unapproved_characters('very happy!')).toEqual([]);
    });
  });
});
