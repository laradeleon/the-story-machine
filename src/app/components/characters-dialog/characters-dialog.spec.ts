import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImageService } from '../../services/image.service';
import { clear_all } from '../../services/saved-values';
import { WriterStateService } from '../../services/writer-state.service';
import { CharactersDialog } from './characters-dialog';

describe('CharactersDialog', () => {
  let fixture: ComponentFixture<CharactersDialog>;
  let dialog: CharactersDialog;
  let state: WriterStateService;
  let compiled: HTMLElement;

  // the real showModal and close (these don't exist in the test browser, so they're undefined)
  const realShowModal = HTMLDialogElement.prototype.showModal;
  const realClose = HTMLDialogElement.prototype.close;

  beforeEach(async () => {
    await clear_all();
    // the test browser can't open or close popups, so we give it fake versions we can check
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();

    await TestBed.configureTestingModule({
      imports: [CharactersDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(CharactersDialog);
    dialog = fixture.componentInstance;
    state = TestBed.inject(WriterStateService);
    fixture.detectChanges();
    await fixture.whenStable();
    compiled = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    // put the real ones back so the fakes don't affect other tests
    HTMLDialogElement.prototype.showModal = realShowModal;
    HTMLDialogElement.prototype.close = realClose;
  });

  // a png-typed file, the same kind of file a writer would pick
  function png(name = 'happy.png') {
    return new File(['x'], name, { type: 'image/png' });
  }

  // makes two characters with the same name, the case that stops the popup closing
  function two_characters_named(name: string) {
    dialog.add_character();
    const first = dialog.selected_character_id()!;
    dialog.add_character();
    const second = dialog.selected_character_id()!;
    dialog.rename_character(first, name);
    dialog.rename_character(second, name);
  }

  it('should say there are no characters yet', () => {
    expect(compiled.querySelector('.column-empty')).not.toBeNull();
  });

  it('should not close while two characters share a name', () => {
    two_characters_named('Dave');

    dialog.close();

    expect(HTMLDialogElement.prototype.close).not.toHaveBeenCalled();
    expect(dialog.error()).toBe('Fix the problems above before closing.');
  });

  it('should close once the duplicate has been renamed', () => {
    two_characters_named('Dave');
    dialog.rename_character(state.characters()[1].id, 'Sam');

    dialog.close();

    expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();
  });

  it('should stop Esc while there are problems', () => {
    two_characters_named('Dave');
    const esc = new Event('cancel', { cancelable: true });

    compiled.querySelector('dialog')!.dispatchEvent(esc);

    expect(esc.defaultPrevented).toBe(true);
  });

  it('should let Esc close the popup when there are no problems', () => {
    dialog.add_character();
    const esc = new Event('cancel', { cancelable: true });

    compiled.querySelector('dialog')!.dispatchEvent(esc);

    expect(esc.defaultPrevented).toBe(false);
  });

  it('should select an emotion as soon as it is added', () => {
    dialog.add_character();

    dialog.add_emotion();
    dialog.add_emotion();

    expect(dialog.selected_emotion_id()).toBe(state.characters()[0].emotions[1].id);
  });

  it('should flag two emotions with the same name and stop the popup closing', () => {
    dialog.add_character();
    dialog.add_emotion();
    dialog.add_emotion();
    const [first, second] = state.characters()[0].emotions;

    dialog.rename_emotion(first.id, 'happy');
    dialog.rename_emotion(second.id, ' Happy ');
    dialog.close();

    expect(dialog.duplicate_emotion_keys().has('happy')).toBe(true);
    expect(dialog.problems()).toContain(
      'An emotion has no name, or a character has two emotions with the same name.',
    );
    expect(HTMLDialogElement.prototype.close).not.toHaveBeenCalled();
  });

  it('should put a dropped or uploaded image on the selected emotion', async () => {
    dialog.add_character();
    dialog.add_emotion();

    expect(await dialog.set_image_from_file(png())).toBe(true);

    // the story only holds a reference with no url yet, the picture is shown from a local blob: URL
    const image = state.characters()[0].emotions[0].image;
    expect(image).toEqual({ asset_id: expect.any(String), url: null });
    expect(dialog.image_url_of(state.characters()[0].emotions[0])!.startsWith('blob:')).toBe(true);
  });

  it('should leave the picture out when another story is opened while it is stored', async () => {
    dialog.add_character();
    dialog.add_emotion();
    const images = TestBed.inject(ImageService);
    vi.spyOn(images, 'prepare_image').mockImplementation(async (file) => {
      await state.open_story('story-2'); // the writer switches stories during the conversion
      return file;
    });

    expect(await dialog.set_image_from_file(png())).toBe(false);
    expect(state.story_id()).toBe('story-2');
    expect(state.characters()).toEqual([]);
  });

  it('should reject an image that is not a jpg or png', async () => {
    dialog.add_character();
    dialog.add_emotion();
    const text = new File(['x'], 'notes.txt', { type: 'text/plain' });

    expect(await dialog.set_image_from_file(text)).toBe(false);
    expect(dialog.error()).toBe('Please choose a jpg or png file.');
    expect(state.characters()[0].emotions[0].image).toBeNull();
  });

  it('should start a new picture centred at 100% when one replaces another', async () => {
    dialog.add_character();
    dialog.add_emotion();
    await dialog.set_image_from_file(png());
    dialog.set_placement({ x: 20, y: 20, zoom: 200 });

    await dialog.set_image_from_file(png('another.png'));

    expect(state.characters()[0].emotions[0]).toMatchObject({
      portrait_x: 0,
      portrait_y: 0,
      zoom: 100,
    });
  });

  it('should store the placement the image editor reports on the selected emotion', () => {
    dialog.add_character();
    dialog.add_emotion();

    dialog.set_placement({ x: -7.5, y: 12, zoom: 220 });

    expect(state.characters()[0].emotions[0]).toMatchObject({
      portrait_x: -7.5,
      portrait_y: 12,
      zoom: 220,
    });
  });

  it('should remove the portrait but keep the emotion', async () => {
    dialog.add_character();
    dialog.add_emotion();
    await dialog.set_image_from_file(png());

    dialog.delete_image();

    expect(state.characters()[0].emotions[0]).toMatchObject({
      emotion: 'Emotion 1',
      image: null,
    });
  });

  describe('picture problems', () => {
    // the red message under the picture, or null if there isn't one
    function problem_text() {
      fixture.detectChanges();
      return compiled.querySelector('.image-problem')?.textContent ?? null;
    }

    it('should show no message under a picture that was saved', async () => {
      dialog.add_character();
      dialog.add_emotion();
      await dialog.set_image_from_file(png());

      expect(problem_text()).toBeNull();
    });

    it('should say so in red under the picture when it could not be saved', async () => {
      dialog.add_character();
      dialog.add_emotion();
      vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
        throw new Error('full');
      });

      await dialog.set_image_from_file(png());
      vi.restoreAllMocks();

      expect(problem_text()).toContain("couldn't be saved");
    });

    it('should say so when the picture could not be found', () => {
      dialog.add_character();
      dialog.add_emotion();
      // e.g. it was never saved, and the page has been reloaded since
      const emotion_id = state.characters()[0].emotions[0].id;
      state.characters.update(([c]) => [
        { ...c, emotions: [{ ...c.emotions[0], image: { asset_id: 'lost', url: null } }] },
      ]);
      dialog.select_emotion(emotion_id);

      expect(problem_text()).toContain('could not be found');
    });
  });

  it('should show the first emotion portrait as the character thumbnail', async () => {
    dialog.add_character();
    dialog.add_emotion();
    await dialog.set_image_from_file(png());
    fixture.detectChanges();

    const thumbnail = compiled.querySelector(
      '.column-scroll.character-list img',
    ) as HTMLImageElement;
    expect(thumbnail.src.startsWith('blob:')).toBe(true);
  });

  it('should draw the emotion thumbnail with the same offset and zoom', async () => {
    dialog.add_character();
    dialog.add_emotion();
    await dialog.set_image_from_file(png());
    dialog.set_placement({ x: 10, y: -5, zoom: 150 });
    fixture.detectChanges();

    // the centre (50%) plus the offsets: 50 + 10 = 60% across, 50 - 5 = 45% down
    const thumbnail = compiled.querySelector('.emotion-list img') as HTMLImageElement;
    expect(thumbnail.style.left).toBe('calc(60%)');
    expect(thumbnail.style.top).toBe('calc(45%)');
    expect(thumbnail.style.transform).toContain('scale(1.5)');
  });

  it('should remove the selected character once the delete is confirmed', () => {
    dialog.add_character();
    dialog.add_character();
    dialog.select_character(state.characters()[0].id);

    dialog.remove_selected_character();

    expect(state.characters().map((c) => c.name)).toEqual(['Character 2']);
    expect(dialog.selected_character_id()).toBeNull();
  });

  describe('through the buttons and boxes', () => {
    // finds a button by the words on it
    function button_named(text: string): HTMLButtonElement | undefined {
      return Array.from(compiled.querySelectorAll('button')).find(
        (button) => button.textContent?.trim() === text,
      ) as HTMLButtonElement | undefined;
    }

    function click(text: string) {
      button_named(text)!.click();
      fixture.detectChanges();
    }

    // types into a box the way the writer does, then reports the input
    function type(selector: string, value: string) {
      const box = compiled.querySelector(selector) as HTMLInputElement;
      box.value = value;
      box.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    }

    // the text of every row in a list
    function rows(selector: string): string[] {
      return Array.from(compiled.querySelectorAll(`${selector} .item-name`)).map((name) =>
        name.textContent!.trim(),
      );
    }

    it('should add a character from the Add character button and show it selected', () => {
      click('Add character');

      expect(rows('.character-list')).toEqual(['Character 1']);
      expect(compiled.querySelector('.character-list .item.selected')).not.toBeNull();
    });

    it('should select a character when its row is clicked', () => {
      click('Add character');
      click('Add character');
      const first = compiled.querySelectorAll('.character-list .item')[0] as HTMLButtonElement;

      first.click();
      fixture.detectChanges();

      expect(dialog.selected_character_id()).toBe(state.characters()[0].id);
    });

    it('should rename a character and describe it from the boxes in the middle column', () => {
      click('Add character');

      type('.column-character input[type="text"]', 'Dave');
      type('.column-character textarea', 'A sailor');

      expect(state.characters()[0]).toMatchObject({ name: 'Dave', description: 'A sailor' });
      expect(rows('.character-list')).toEqual(['Dave']);
    });

    it('should show "Unnamed" for a character with a blank name in the list', () => {
      click('Add character');
      type('.column-character input[type="text"]', '   ');

      expect(rows('.character-list')).toEqual(['Unnamed']);
    });

    it('should add an emotion from the Add emotion button and list it', () => {
      click('Add character');
      click('Add emotion');

      expect(rows('.emotion-list')).toEqual(['Emotion 1']);
      expect(compiled.querySelector('.emotion-list .item.selected')).not.toBeNull();
    });

    it('should rename the selected emotion from the emotion name box', () => {
      click('Add character');
      click('Add emotion');

      type('.column-emotion input[type="text"]', 'happy');

      expect(rows('.emotion-list')).toEqual(['happy']);
    });

    it('should select an emotion when its row is clicked', () => {
      click('Add character');
      click('Add emotion');
      click('Add emotion');
      const first = compiled.querySelectorAll('.emotion-list .item')[0] as HTMLButtonElement;

      first.click();
      fixture.detectChanges();

      expect(dialog.selected_emotion_id()).toBe(state.characters()[0].emotions[0].id);
    });

    it('should tell the writer when two characters share a name', () => {
      click('Add character');
      click('Add character');

      dialog.rename_character(state.characters()[0].id, 'Dave');
      dialog.rename_character(state.characters()[1].id, 'Dave');
      fixture.detectChanges();

      expect(compiled.querySelector('.modal-warning')!.textContent).toContain(
        'Two or more characters share a name.',
      );
      expect(compiled.querySelectorAll('.tag-warning').length).toBe(2);
    });

    it('should show the error message when an emotion is added with no character', () => {
      dialog.add_emotion();
      fixture.detectChanges();

      expect(compiled.querySelector('.modal-error')!.textContent).toContain(
        'Select or add a character first.',
      );
    });

    it('should show the empty messages when a character has no emotions and nothing is selected', () => {
      expect(compiled.querySelector('.column-character > .column-empty')!.textContent).toContain(
        'Select a character, or add one.',
      );
      click('Add character');

      expect(compiled.querySelector('.emotion-list .column-empty')!.textContent).toContain(
        'No emotions yet.',
      );
      expect(compiled.querySelector('.column-emotion > .column-empty')!.textContent).toContain(
        'Select an emotion to see its portrait.',
      );
    });

    it('should remove the selected character once Remove character is confirmed', () => {
      click('Add character');
      click('Remove character');

      expect(compiled.querySelector('app-confirm-dialog')).not.toBeNull();
      click('Delete');

      expect(state.characters()).toEqual([]);
    });

    it('should keep the character when its delete popup is closed without confirming', () => {
      click('Add character');
      click('Remove character');

      const confirm = compiled.querySelector('app-confirm-dialog dialog') as HTMLDialogElement;
      confirm.dispatchEvent(new Event('close'));
      fixture.detectChanges();

      expect(compiled.querySelector('app-confirm-dialog')).toBeNull();
      expect(state.characters().length).toBe(1);
    });

    it('should remove only the selected emotion from the Delete emotion button once confirmed', () => {
      click('Add character');
      click('Add emotion');
      click('Add emotion');
      dialog.select_emotion(state.characters()[0].emotions[0].id);
      fixture.detectChanges();
      click('Delete emotion');

      expect(compiled.querySelector('app-confirm-dialog')).not.toBeNull();
      click('Delete');

      expect(rows('.emotion-list')).toEqual(['Emotion 2']);
      expect(dialog.selected_emotion_id()).toBeNull();
      expect(state.characters()).toHaveLength(1);
    });

    it('should hide and show the see-through guide from the outline button', () => {
      click('Add character');
      click('Add emotion');
      expect(compiled.querySelector('.silhouette')).not.toBeNull();

      click('Hide outline');
      expect(compiled.querySelector('.silhouette')).toBeNull();
      expect(button_named('Show outline')).toBeDefined();

      click('Show outline');
      expect(compiled.querySelector('.silhouette')).not.toBeNull();
    });

    it('should show the empty picture as a darker square in the emotion list', () => {
      click('Add character');
      click('Add emotion');

      expect(compiled.querySelector('.emotion-list .thumbnail-empty')).not.toBeNull();
    });

    it('should show the picture error when the file cannot be read', async () => {
      const images = TestBed.inject(ImageService);
      vi.spyOn(images, 'prepare_image').mockRejectedValue(new Error('The file is damaged.'));
      click('Add character');
      click('Add emotion');

      await dialog.set_image_from_file(png());
      fixture.detectChanges();

      expect(compiled.querySelector('.modal-error')!.textContent).toContain('The file is damaged.');
    });

    it('should use a general message when the read fails with something that is not an error', async () => {
      const images = TestBed.inject(ImageService);
      vi.spyOn(images, 'prepare_image').mockRejectedValue('oops');
      click('Add character');
      click('Add emotion');

      await dialog.set_image_from_file(png());

      expect(dialog.error()).toBe('Could not read the image.');
    });

    it('should do nothing for emotion actions when no emotion is selected', () => {
      click('Add character');
      const before = JSON.stringify(state.characters());

      dialog.rename_emotion('missing', 'x');
      dialog.delete_image();
      dialog.remove_selected_emotion();
      dialog.set_placement({ x: 5, y: 5, zoom: 200 });

      expect(JSON.stringify(state.characters())).toBe(before);
    });

    it('should do nothing for emotion actions when no character is selected', () => {
      dialog.rename_emotion('missing', 'x');
      dialog.delete_image();
      dialog.remove_selected_emotion();
      dialog.remove_selected_character();

      expect(state.characters()).toEqual([]);
    });

    it('should ask for an emotion before a picture is put on a character', async () => {
      click('Add character');

      expect(await dialog.set_image_from_file(png())).toBe(false);
      expect(dialog.error()).toBe('Select an emotion first.');
    });
  });

  it('should close the popup when Close is pressed and there are no problems', () => {
    const close_button = Array.from(compiled.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Close',
    )!;

    close_button.click();

    expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();
  });
});
