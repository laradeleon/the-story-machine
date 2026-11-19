import { Injectable, signal } from '@angular/core';
import { AssetRef } from '../../models/asset';
import { delete_asset, load_story_assets, save_asset } from './saved-values';

// how long a picture the story doesn't use is kept before it's thrown away (one day, in ms)
export const UNUSED_ASSET_LIFETIME = 24 * 60 * 60 * 1000;

// keeps track of the story's pictures (portraits now, backgrounds later).
//
// a new picture is saved in IndexedDB straight away and shown from a temporary "blob:" URL,
// which points at the file in this browser's memory. the story only stores { asset_id, url: null }.
// once the picture is uploaded to Azure, its real url goes in the story and the local copy is dropped.
// blob: URLs only work in this browser until the page closes, so they are never saved in the story
@Injectable({ providedIn: 'root' }) // global singleton
export class AssetService {
  // asset_id -> temporary blob: URL, for every picture not uploaded yet.
  // a signal so the pictures on screen update when they're restored
  private local_urls = signal<ReadonlyMap<string, string>>(new Map());

  // asset_ids of new pictures IndexedDB couldn't save (e.g. it's full). they're shown for now,
  // but are gone after a reload, so the writer is warned
  private unsaved = signal<ReadonlySet<string>>(new Set());

  // where to show a picture from: its Azure url once uploaded, otherwise its local copy.
  // null when there's no picture, or its local copy is gone
  url_of(image: AssetRef | null | undefined): string | null {
    if (!image) {
      return null;
    }
    return image.url ?? this.local_urls().get(image.asset_id) ?? null;
  }

  // true if the picture is only in memory because IndexedDB couldn't save it
  is_unsaved(image: AssetRef | null | undefined): boolean {
    return !!image && this.unsaved().has(image.asset_id);
  }

  // adds a new picture to a story: saves it in IndexedDB and gives back the reference to put in the story.
  // if it can't be saved it's still shown for now, and is_unsaved() says so
  async add(story_id: string, blob: Blob): Promise<AssetRef> {
    const asset_id = crypto.randomUUID();
    const saved = await save_asset({ asset_id, story_id, blob, created_at: Date.now() });
    if (!saved) {
      this.unsaved.update((ids) => new Set(ids).add(asset_id));
    }
    this.show_locally(asset_id, blob);
    return { asset_id, url: null };
  }

  // when a story is opened: makes local URLs for its pictures that aren't uploaded yet.
  // pictures the story no longer uses (deleted or replaced since) are thrown away instead, but only
  // once they're a day old: a picture added just before a reload may not be in the saved draft yet,
  // since the picture and the draft are saved separately.
  // used_asset_ids is null when the draft couldn't be read, then nothing is thrown away
  async restore(story_id: string, used_asset_ids: ReadonlySet<string> | null) {
    this.forget_all_local();
    const unused: string[] = [];
    for (const asset of await load_story_assets(story_id)) {
      const is_used = !used_asset_ids || used_asset_ids.has(asset.asset_id);
      if (!is_used && Date.now() - asset.created_at > UNUSED_ASSET_LIFETIME) {
        unused.push(asset.asset_id);
      } else {
        this.show_locally(asset.asset_id, asset.blob);
      }
    }
    await Promise.all(unused.map(delete_asset));
  }

  // a picture is now in Azure and the story with its url is saved, so the local copy isn't needed
  uploaded(asset_id: string) {
    return this.forget(asset_id);
  }

  // throws away a picture's local copy, from memory and IndexedDB. used when it's uploaded,
  // and straight away when the writer deletes or replaces it.
  // a picture already in Azure has no local copy, it's left for the server's cleanup
  async forget(asset_id: string) {
    const url = this.local_urls().get(asset_id);
    if (url) {
      URL.revokeObjectURL(url); // frees the memory the blob: URL was holding on to
      this.local_urls.update((urls) => without(urls, asset_id));
    }
    this.unsaved.update((ids) => without_id(ids, asset_id));
    await delete_asset(asset_id);
  }

  private show_locally(asset_id: string, blob: Blob) {
    const url = URL.createObjectURL(blob);
    this.local_urls.update((urls) => new Map(urls).set(asset_id, url));
  }

  // frees every local URL, e.g. when switching to another story
  private forget_all_local() {
    for (const url of this.local_urls().values()) {
      URL.revokeObjectURL(url);
    }
    this.local_urls.set(new Map());
    this.unsaved.set(new Set());
  }
}

// a copy of the set without one id (signals need a new set, not a changed one)
function without_id(ids: ReadonlySet<string>, id: string): ReadonlySet<string> {
  const copy = new Set(ids);
  copy.delete(id);
  return copy;
}

// a copy of the map without one key (signals need a new map, not a changed one)
function without(urls: ReadonlyMap<string, string>, key: string): ReadonlyMap<string, string> {
  const copy = new Map(urls);
  copy.delete(key);
  return copy;
}
