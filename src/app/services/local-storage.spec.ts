import { load, save } from './local-storage';

describe('local-storage', () => {
  beforeEach(() => {
    // clear storage so every test starts the same
    localStorage.clear();
  });

  it('should give back the same value after saving', () => {
    save('key', { title: 'The Lighthouse' });

    expect(load('key', null)).toEqual({ title: 'The Lighthouse' });
  });

  it('should give the fallback when nothing is saved', () => {
    expect(load('missing', 'fallback')).toBe('fallback');
  });

  it('should give the fallback when the saved text is broken', () => {
    localStorage.setItem('key', '{not json');

    expect(load('key', 'fallback')).toBe('fallback');
  });

  it('should remove the key when saving null', () => {
    save('key', 'hello');
    save('key', null);

    expect(localStorage.getItem('key')).toBeNull();
  });
});
