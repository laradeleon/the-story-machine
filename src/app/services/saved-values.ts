import { DBSchema, IDBPDatabase, openDB } from 'idb';
import { PendingAsset } from '../../models/asset';
import { Draft } from '../../models/draft';

// IndexedDB helpers. plain functions, not a service, since the only state is the shared connection

const DB_NAME = 'story-machine';
const DB_VERSION = 3; // raise this when the stores below change, so upgrade runs again

// the stores ("tables") in the database and what each one holds
interface SavedValuesDB extends DBSchema {
  values: { key: string; value: unknown }; // simple key -> value pairs, used like localStorage
  drafts: { key: string; value: Draft }; // one draft per story, keyed by its story_id
  // pictures not uploaded to Azure yet, keyed by asset_id. the by_story index finds one story's pictures
  assets: { key: string; value: PendingAsset; indexes: { by_story: string } };
}

// a Promise, so calls at the same time share one open
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
      // a newer tab needs to upgrade, so close this connection instead of blocking it
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

// reads a saved value, or the fallback if it's missing or IndexedDB fails
export async function load<T>(key: string, fallback: T): Promise<T> {
  try {
    const saved = await (await open_db()).get('values', key);
    return saved === undefined ? fallback : (saved as T); // undefined means it was never saved
  } catch {
    return fallback;
  }
}

// saves a value, or removes it when it's null
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

export async function load_draft(story_id: string): Promise<Draft | null> {
  // throws on failure, unlike the others, so "couldn't read" differs from "no draft"
  return (await (await open_db()).get('drafts', story_id)) ?? null;
}

// saves a story's draft, giving back whether it worked
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

export async function clear_all(): Promise<void> {
  const db = await open_db();
  await Promise.all([db.clear('values'), db.clear('drafts'), db.clear('assets')]);
}
