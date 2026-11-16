// keeps the login token the backend gives back when you sign in
// it's saved in the browser so a refresh keeps you signed in (until the token runs out, 1 hour by default)

const TOKEN_KEY = 'tsm_token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null; // some browsers block storage, e.g. private windows
  }
}

export function saveToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // can't save it, you'll just be signed out after a refresh
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // nothing saved to remove
  }
}
