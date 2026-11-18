import { Injectable } from '@angular/core';

// only these file types are allowed
const allowed_types = ['image/jpeg', 'image/png'];

// largest file we accept, in bytes (5 MB)
const max_bytes = 5 * 1024 * 1024;

// checks and reads uploaded pictures. used for character portraits now, and for backgrounds later
@Injectable({ providedIn: 'root' })
export class ImageService {
  // returns an error message if the file can't be used, or null if it is fine
  check_image(file: File): string | null {
    if (!allowed_types.includes(file.type)) {
      return 'Please choose a jpg or png file.';
    }
    if (file.size > max_bytes) {
      return 'The file must be 5 MB or smaller.';
    }
    return null;
  }

  // reads the file into a data URL (a string that holds the whole image, so it can be shown in an <img>)
  read_image(file: File): Promise<string> {
    const problem = this.check_image(file);
    if (problem) {
      return Promise.reject(new Error(problem));
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Could not read the image file.'));
      reader.readAsDataURL(file);
    });
  }
}
