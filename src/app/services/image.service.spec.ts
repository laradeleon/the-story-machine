import { TestBed } from '@angular/core/testing';
import { ImageService } from './image.service';

describe('ImageService', () => {
  let service: ImageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ImageService);
  });

  it('accepts a png under the size limit', () => {
    const file = new File(['x'], 'hero.png', { type: 'image/png' });
    expect(service.check_image(file)).toBeNull();
  });

  it('accepts a jpeg under the size limit', () => {
    const file = new File(['x'], 'hero.jpg', { type: 'image/jpeg' });
    expect(service.check_image(file)).toBeNull();
  });

  it('rejects other file types', () => {
    const file = new File(['x'], 'notes.txt', { type: 'text/plain' });
    expect(service.check_image(file)).toBe('Please choose a jpg or png file.');
  });

  it('rejects files over 5 MB', () => {
    const file = new File(['x'], 'big.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 });
    expect(service.check_image(file)).toBe('The file must be 5 MB or smaller.');
  });

  it('read_image rejects a bad file without reading it', async () => {
    const file = new File(['x'], 'notes.txt', { type: 'text/plain' });
    await expect(service.read_image(file)).rejects.toThrow('Please choose a jpg or png file.');
  });

  it('read_image returns a data URL for a valid png', async () => {
    const file = new File(['x'], 'hero.png', { type: 'image/png' });
    const url = await service.read_image(file);
    expect(url.startsWith('data:image/png;base64,')).toBe(true);
  });
});
