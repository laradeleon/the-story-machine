import { Injectable } from '@angular/core';

// only these file types are allowed. also used by the image editor's file picker and hint
export const allowed_types = ['image/jpeg', 'image/png'];

// the allowed types the way the writer would say them, for messages
export const allowed_type_names = 'jpg or png';

// largest file we accept, in bytes (5 MB)
const max_bytes = 5 * 1024 * 1024;

// pictures bigger than this on their longest side are shrunk to it. big enough to stay sharp
// on a full-screen background, and for a portrait zoomed in by the image editor
export const max_side = 2048;

// how good the WebP picture looks, from 0 to 1. 0.85 looks the same as the original to the eye
// but is a lot smaller. WebP keeps see-through parts, so cut-out portraits stay cut out
const webp_quality = 0.85;

// checks and prepares uploaded pictures. used for character portraits now, and for backgrounds later
@Injectable({ providedIn: 'root' })
export class ImageService {
  // returns an error message if the file can't be used, or null if it is fine
  check_image(file: File): string | null {
    if (!allowed_types.includes(file.type)) {
      return `Please choose a ${allowed_type_names} file.`;
    }
    if (file.size > max_bytes) {
      return 'The file must be 5 MB or smaller.';
    }
    return null;
  }

  // checks the file and gives back the picture to store: a smaller WebP copy when the browser can
  // make one, otherwise the file as it is (a File is a Blob, so it can be stored either way).
  // the picture is only shrunk, never cropped, so the editor's placement means the same on both
  async prepare_image(file: File): Promise<Blob> {
    const problem = this.check_image(file);
    if (problem) {
      throw new Error(problem);
    }

    try {
      const webp = await to_webp(file);
      // keep the original if the WebP didn't come out smaller (e.g. a tiny png)
      return webp.size < file.size ? webp : file;
    } catch {
      // the browser couldn't convert it (too old, or can't make WebP), the original still works
      return file;
    }
  }
}

// the size to draw a picture at so its longest side is at most max_side, keeping its shape.
// pictures that are small enough keep their size, they're never made bigger
export function scaled_size(width: number, height: number): { width: number; height: number } {
  const scale = Math.min(1, max_side / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

// draws the picture onto a canvas (shrunk if it's too big) and saves the canvas as WebP.
// throws if any step isn't possible, so the caller can fall back to the original
async function to_webp(file: File): Promise<Blob> {
  // decodes the picture. phone photos are often stored sideways with a note saying which way is up,
  // 'from-image' follows that note so the picture isn't saved sideways
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const { width, height } = scaled_size(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('This browser cannot draw pictures.');
    }
    context.imageSmoothingQuality = 'high'; // a smoother shrink
    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', webp_quality),
    );
    // browsers that can't make WebP give back a png instead, which wouldn't be any smaller
    if (!blob || blob.type !== 'image/webp') {
      throw new Error('This browser cannot make WebP pictures.');
    }
    return blob;
  } finally {
    bitmap.close(); // frees the decoded picture's memory
  }
}
