import { Injectable } from '@angular/core';

export const allowed_types = ['image/jpeg', 'image/png'];

// the allowed types as the writer would say them
export const allowed_type_names = 'jpg or png';

const max_bytes = 5 * 1024 * 1024; // 5 MB

// longest side a picture is shrunk to, sharp enough for a full-screen background
export const max_side = 2048;

// 0 to 1. 0.85 looks the same as the original but is much smaller
const webp_quality = 0.85;

// checks and prepares uploaded pictures
@Injectable({ providedIn: 'root' })
export class ImageService {
  // an error message if the file can't be used, otherwise null
  check_image(file: File): string | null {
    if (!allowed_types.includes(file.type)) {
      return `Please choose a ${allowed_type_names} file.`;
    }
    if (file.size > max_bytes) {
      return 'The file must be 5 MB or smaller.';
    }
    return null;
  }

  // checks the file and gives back a smaller WebP copy, or the original if that isn't possible
  async prepare_image(file: File): Promise<Blob> {
    const problem = this.check_image(file);
    if (problem) {
      throw new Error(problem);
    }

    try {
      const webp = await to_webp(file);
      return webp.size < file.size ? webp : file; // a tiny png can come out bigger
    } catch {
      return file;
    }
  }
}

export function scaled_size(width: number, height: number): { width: number; height: number } {
  const scale = Math.min(1, max_side / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

// shrinks the picture to max_side and saves it as WebP, throwing if the browser can't
async function to_webp(file: File): Promise<Blob> {
  // 'from-image' turns sideways phone photos the right way up
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
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', webp_quality),
    );
    // browsers that can't make WebP give back a png
    if (!blob || blob.type !== 'image/webp') {
      throw new Error('This browser cannot make WebP pictures.');
    }
    return blob;
  } finally {
    bitmap.close();
  }
}
