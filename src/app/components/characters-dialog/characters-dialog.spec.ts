import { ComponentFixture, TestBed } from '@angular/core/testing';
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
    localStorage.clear();
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

  it('should add a character and select it', () => {
    dialog.add_character();

    const characters = state.characters();
    expect(characters.length).toBe(1);
    expect(characters[0].name).toBe('Character 1');
    expect(characters[0].emotions).toEqual([]);
    expect(dialog.selected_character_id()).toBe(characters[0].id);
  });

  it('should give a new character the first free name after a removal', () => {
    dialog.add_character();
    dialog.add_character();
    dialog.remove_character(state.characters()[0].id);

    dialog.add_character();

    expect(state.characters().map((c) => c.name)).toEqual(['Character 2', 'Character 1']);
    expect(dialog.duplicate_character_names().size).toBe(0);
  });

  it('should rename and describe a character', () => {
    dialog.add_character();
    const id = dialog.selected_character_id()!;

    dialog.rename_character(id, 'Dave');
    dialog.set_description(id, 'A sailor');

    expect(state.characters()[0]).toMatchObject({ name: 'Dave', description: 'A sailor' });
  });

  it('should allow two characters with the same name, but flag it', () => {
    two_characters_named('Dave');

    expect(state.characters().length).toBe(2);
    expect(dialog.duplicate_character_names().has('dave')).toBe(true);
    expect(dialog.has_problems()).toBe(true);
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

  it('should not close while a character has no name', () => {
    dialog.add_character();
    dialog.rename_character(dialog.selected_character_id()!, '   ');

    dialog.close();

    expect(dialog.problems()).toContain('A character has no name.');
    expect(HTMLDialogElement.prototype.close).not.toHaveBeenCalled();
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

  it('should remove a character and clear the selection', () => {
    dialog.add_character();
    const id = dialog.selected_character_id()!;

    dialog.remove_character(id);

    expect(state.characters()).toEqual([]);
    expect(dialog.selected_character_id()).toBeNull();
  });

  it('should add emotions named Emotion 1, then Emotion 2, and select the new one', () => {
    dialog.add_character();

    dialog.add_emotion();
    dialog.add_emotion();

    const emotions = state.characters()[0].emotions;
    expect(emotions.map((e) => e.emotion)).toEqual(['Emotion 1', 'Emotion 2']);
    expect(emotions[1].image_url).toBeNull();
    expect(dialog.selected_emotion_id()).toBe(emotions[1].id);
  });

  it('should start a new emotion centred at 100% zoom', () => {
    dialog.add_character();
    dialog.add_emotion();

    expect(state.characters()[0].emotions[0]).toMatchObject({
      portrait_x: 0,
      portrait_y: 0,
      zoom: 100,
    });
  });

  it('should ask for a character before adding an emotion', () => {
    dialog.add_emotion();

    expect(dialog.error()).toBe('Select or add a character first.');
    expect(state.characters()).toEqual([]);
  });

  it('should rename an emotion and keep its place in the list', () => {
    dialog.add_character();
    dialog.add_emotion();
    dialog.add_emotion();
    const first = state.characters()[0].emotions[0].id;

    dialog.rename_emotion(first, 'happy');

    expect(state.characters()[0].emotions.map((e) => e.emotion)).toEqual(['happy', 'Emotion 2']);
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

  it('should stop the popup closing when an emotion has no name', () => {
    dialog.add_character();
    dialog.add_emotion();
    dialog.rename_emotion(state.characters()[0].emotions[0].id, '  ');

    dialog.close();

    expect(HTMLDialogElement.prototype.close).not.toHaveBeenCalled();
  });

  it('should put a dropped or uploaded image on the selected emotion', async () => {
    dialog.add_character();
    dialog.add_emotion();

    expect(await dialog.set_image_from_file(png())).toBe(true);

    const image = state.characters()[0].emotions[0].image_url;
    expect(image!.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('should reject an image that is not a jpg or png', async () => {
    dialog.add_character();
    dialog.add_emotion();
    const text = new File(['x'], 'notes.txt', { type: 'text/plain' });

    expect(await dialog.set_image_from_file(text)).toBe(false);
    expect(dialog.error()).toBe('Please choose a jpg or png file.');
    expect(state.characters()[0].emotions[0].image_url).toBeNull();
  });

  it('should ask for an emotion to be selected before adding an image', async () => {
    dialog.add_character();

    expect(await dialog.set_image_from_file(png())).toBe(false);
    expect(dialog.error()).toBe('Select an emotion first.');
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
      image_url: null,
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
    expect(thumbnail.src.startsWith('data:image/png;base64,')).toBe(true);
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

  it('should remove the selected emotion, not the whole character', () => {
    dialog.add_character();
    dialog.add_emotion();
    dialog.add_emotion();
    dialog.select_emotion(state.characters()[0].emotions[0].id);

    dialog.remove_selected_emotion();

    expect(state.characters()[0].emotions.map((e) => e.emotion)).toEqual(['Emotion 2']);
    expect(dialog.selected_emotion_id()).toBeNull();
    expect(state.characters().length).toBe(1);
  });

  it('should close the popup when Close is pressed and there are no problems', () => {
    const close_button = Array.from(compiled.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Close',
    )!;

    close_button.click();

    expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();
  });
});
