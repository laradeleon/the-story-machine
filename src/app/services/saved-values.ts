import { DBSchema, IDBPDatabase, openDB } from 'idb';
import { PendingAsset } from '../../models/asset';
import { Draft } from '../../models/draft';

// helpers for saving and loading values in the browser's IndexedDB.
// plain functions, not a service, since they keep no state of their own
// (apart from the one open database connection, which every call shares).
//
// IndexedDB is async, so every function here returns a Promise.
// it stores objects as they are (no JSON needed), can hold Blobs (for images later),
// and has a much bigger size limit than localStorage (which is about 5 MB).
// the idb library wraps IndexedDB's callback API in Promises

const DB_NAME = 'story-machine';
const DB_VERSION = 3; // raise this when the stores below change, so upgrade runs again

// the stores ("tables") in the database and what each one holds
interface SavedValuesDB extends DBSchema {
  values: { key: string; value: unknown }; // simple key -> value pairs, used like localStorage
  drafts: { key: string; value: Draft }; // one draft per story, keyed by its story_id
  // pictures not uploaded to Azure yet, keyed by asset_id. the by_story index finds one story's pictures
  assets: { key: string; value: PendingAsset; indexes: { by_story: string } };
}

// the open database. holds the Promise rather than the database itself,
// so two calls at the same time share one open instead of both opening it
let db_promise: Promise<IDBPDatabase<SavedValuesDB>> | null = null;

// opens the database, making any stores that don't exist yet
function open_db(): Promise<IDBPDatabase<SavedValuesDB>> {
  if (!db_promise) {
    db_promise = openDB<SavedValuesDB>(DB_NAME, DB_VERSION, {
      // runs the first time, or when DB_VERSION goes up
      upgrade(db) {
        if (!db.objectStoreNames.contains('values')) {
          db.createObjectStore('values');
        }
        if (!db.objectStoreNames.contains('drafts')) {
          db.createObjectStore('drafts', { keyPath: 'story_id' }); // the key is read from draft.story_id
        }
        if (!db.objectStoreNames.contains('assets')) {
          const assets = db.createObjectStore('assets', { keyPath: 'asset_id' });
          assets.createIndex('by_story', 'story_id');
        }
      },
      // a newer version of the app has opened in another tab and needs to raise DB_VERSION.
      // it can't until every tab closes its connection, so close this one instead of making it wait forever.
      // this tab's next call opens again, which fails (its DB_VERSION is now too old) and falls back
      // like any other IndexedDB error, until the page is reloaded
      blocking(_current_version, _new_version, event) {
        (event.target as IDBDatabase).close();
        db_promise = null;
      },
      // the browser closed the connection itself (e.g. the user cleared site data), open again next time
      terminated() {
        db_promise = null;
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
    const saved = await (await open_db()).get('values', key);
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
      await db.delete('values', key);
    } else {
      await db.put('values', value, key);
    }
  } catch {
    // storage is full or blocked, the value is still kept in memory for this visit
  }
}

// reads one story's draft, or null if that story has no draft saved.
// unlike the other functions here this throws when IndexedDB fails, because "couldn't read it"
// has to be told apart from "there isn't one" (see WriterStateService.open_story)
export async function load_draft(story_id: string): Promise<Draft | null> {
  return (await (await open_db()).get('drafts', story_id)) ?? null;
}

// saves a story's draft, replacing the one saved before it (if any).
// gives back whether it was saved, for callers that must only go on once it is
export async function save_draft(draft: Draft): Promise<boolean> {
  try {
    await (await open_db()).put('drafts', draft);
    return true;
  } catch {
    // storage is full or blocked, the draft is still kept in memory for this visit
    return false;
  }
}

// keeps a picture that hasn't been uploaded yet. gives back whether it was saved
export async function save_asset(asset: PendingAsset): Promise<boolean> {
  try {
    await (await open_db()).put('assets', asset);
    return true;
  } catch {
    // storage is full or blocked, the picture is still shown for this visit
    return false;
  }
}

// every picture of one story that hasn't been uploaded yet (empty if IndexedDB fails)
export async function load_story_assets(story_id: string): Promise<PendingAsset[]> {
  try {
    return await (await open_db()).getAllFromIndex('assets', 'by_story', story_id);
  } catch {
    return [];
  }
}

// forgets a picture, once it's uploaded or no longer used
export async function delete_asset(asset_id: string): Promise<void> {
  try {
    await (await open_db()).delete('assets', asset_id);
  } catch {
    // blocked, it's tried again the next time the story is opened
  }
}

// removes every saved value, draft and picture. used by the tests so each one starts the same
export async function clear_all(): Promise<void> {
  const db = await open_db();
  await Promise.all([db.clear('values'), db.clear('drafts'), db.clear('assets')]);
}
