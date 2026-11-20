import { clearToken, getToken, saveToken } from './auth-token';

describe('auth token', () => {
  beforeEach(() => localStorage.clear());

  afterEach(() => vi.restoreAllMocks());

  it('should have no token before signing in', () => {
    expect(getToken()).toBeNull();
  });

  it('should save the token and read it back', () => {
    saveToken('abc123');
    expect(getToken()).toBe('abc123');
  });

  it('should forget the token after clearing it', () => {
    saveToken('abc123');
    clearToken();
    expect(getToken()).toBeNull();
  });

  // some browsers block storage (e.g. private windows), the app should keep working without it
  it('should not crash when the browser blocks storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(() => saveToken('abc123')).not.toThrow();
    expect(() => clearToken()).not.toThrow();
    expect(getToken()).toBeNull();
  });
});
