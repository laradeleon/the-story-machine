import { IDBPDatabase, openDB } from 'idb';

// helpers for saving and loading values in the browser's IndexedDB.
// plain functions, not a service, since they keep no state of their own
// (apart from the one open database connection, which every call shares).
//
// IndexedDB is async, so every function here returns a Promise.
// it stores objects as they are (no JSON needed), can hold Blobs (for images later),
// and has a much bigger size limit than localStorage (which is about 5 MB).
// the idb library wraps IndexedDB's callback API in Promises

const DB_NAME = 'story-machine';
const DB_VERSION = 1; // raise this when the stores below change, so upgrade runs again
const STORE_NAME = 'values'; // one simple key -> value store, used like localStorage

// the open database. holds the Promise rather than the database itself,
// so two calls at the same time share one open instead of both opening it
let db_promise: Promise<IDBPDatabase> | null = null;

// opens the database, making the store the first time it's opened
function open_db(): Promise<IDBPDatabase> {
  if (!db_promise) {
    db_promise = openDB(DB_NAME, DB_VERSION, {
      // runs the first time, or when DB_VERSION goes up
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    }).catch((error) => {
      db_promise = null; // let the next call try again instead of failing forever
      throw error;
    });
  }
  return db_promise;
}

// reads a saved value, or gives back the fallback if nothing was saved.
// IndexedDB can fail (blocked by the browser, private mode), so any error gives back the fallback instead
export async function load<T>(key: string, fallback: T): Promise<T> {
  try {
    const saved = await (await open_db()).get(STORE_NAME, key);
    return saved === undefined ? fallback : (saved as T); // undefined means it was never saved
  } catch {
    return fallback;
  }
}

// saves a value, or removes it when it's null.
// values are copied as they are, so plain objects, arrays, strings, numbers and Blobs all work
export async function save(key: string, value: unknown): Promise<void> {
  try {
    const db = await open_db();
    if (value === null) {
      await db.delete(STORE_NAME, key);
    } else {
      await db.put(STORE_NAME, value, key);
    }
  } catch {
    // storage is full or blocked, the value is still kept in memory for this visit
  }
}

// removes every saved value. used by the tests so each one starts the same
export async function clear_all(): Promise<void> {
  await (await open_db()).clear(STORE_NAME);
}
