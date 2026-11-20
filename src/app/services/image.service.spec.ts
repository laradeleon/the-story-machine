import { TestBed } from '@angular/core/testing';
import { ImageService, max_side, scaled_size } from './image.service';

// stands in for the browser decoding and drawing a picture of this size,
// with toBlob giving back `result` (what a real browser would make from the canvas)
function fake_browser(width: number, height: number, result: Blob | null) {
  const close = vi.fn();
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width, height, close }));
  const drawImage = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage,
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((done) => done(result));
  return { drawImage, close };
}

// a png file big enough that the fake WebP below is smaller than it
function big_png() {
  return new File(['x'.repeat(100)], 'hero.png', { type: 'image/png' });
}

const webp = new Blob(['small'], { type: 'image/webp' });

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

  it('prepare_image rejects a bad file', async () => {
    const file = new File(['x'], 'notes.txt', { type: 'text/plain' });
    await expect(service.prepare_image(file)).rejects.toThrow('Please choose a jpg or png file.');
  });

  describe('prepare_image conversion', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it('gives back a WebP copy of the picture', async () => {
      fake_browser(800, 600, webp);

      expect(await service.prepare_image(big_png())).toBe(webp);
    });

    it('shrinks a picture that is too big, keeping its shape', async () => {
      const { drawImage } = fake_browser(4096, 2048, webp);

      await service.prepare_image(big_png());

      expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, max_side, max_side / 2);
    });

    it('turns a phone photo the right way up', async () => {
      fake_browser(800, 600, webp);
      const file = big_png();

      await service.prepare_image(file);

      expect(createImageBitmap).toHaveBeenCalledWith(file, { imageOrientation: 'from-image' });
    });

    it('frees the decoded picture once it is drawn', async () => {
      const { close } = fake_browser(800, 600, webp);

      await service.prepare_image(big_png());

      expect(close).toHaveBeenCalled();
    });

    it('keeps the original when the browser makes a png instead of WebP', async () => {
      fake_browser(800, 600, new Blob(['png'], { type: 'image/png' }));
      const file = big_png();

      expect(await service.prepare_image(file)).toBe(file);
    });

    it('keeps the original when the WebP is not smaller', async () => {
      fake_browser(800, 600, new Blob(['x'.repeat(500)], { type: 'image/webp' }));
      const file = big_png();

      expect(await service.prepare_image(file)).toBe(file);
    });

    it('keeps the original when the browser cannot decode pictures', async () => {
      vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('not supported')));
      const file = big_png();

      expect(await service.prepare_image(file)).toBe(file);
    });
  });
});

describe('scaled_size', () => {
  it('keeps a picture that is small enough the same size', () => {
    expect(scaled_size(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it('shrinks a wide picture so its width is the largest allowed', () => {
    expect(scaled_size(4096, 1024)).toEqual({ width: max_side, height: 512 });
  });

  it('shrinks a tall picture so its height is the largest allowed', () => {
    expect(scaled_size(1000, 4000)).toEqual({ width: 512, height: max_side });
  });

  it('never makes a picture bigger', () => {
    expect(scaled_size(100, 50)).toEqual({ width: 100, height: 50 });
  });
});
