// helpers for saving and loading values in the browser's localStorage.
// plain functions, not a service, since they keep no state of their own

// reads a saved value, or gives back the fallback if nothing was saved.
// localStorage can throw (blocked by the browser, private mode, broken saved data),
// so any error gives back the fallback instead
export function load<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved === null ? fallback : (JSON.parse(saved) as T);
  } catch {
    return fallback;
  }
}

// saves a value, or removes it when it's null
export function save(key: string, value: unknown) {
  try {
    if (value === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    // storage is full or blocked, the value is still kept in memory for this visit
  }
}
