import { Injectable, signal } from '@angular/core';
import { AssetRef } from '../../models/asset';
import { delete_asset, load_story_assets, save_asset } from './saved-values';

// how long an unused picture is kept before it's thrown away (one day, in ms)
export const UNUSED_ASSET_LIFETIME = 24 * 60 * 60 * 1000;

// the story's pictures: kept in IndexedDB and shown from blob: URLs until they're uploaded to Azure
@Injectable({ providedIn: 'root' })
export class AssetService {
  // asset_id -> blob: URL, for every picture not uploaded yet
  private local_urls = signal<ReadonlyMap<string, string>>(new Map());

  // asset_ids of pictures IndexedDB couldn't save, so they're gone after a reload
  private unsaved = signal<ReadonlySet<string>>(new Set());

  // the Azure url, else the local copy, else null
  url_of(image: AssetRef | null | undefined): string | null {
    if (!image) {
      return null;
    }
    return image.url ?? this.local_urls().get(image.asset_id) ?? null;
  }

  is_unsaved(image: AssetRef | null | undefined): boolean {
    return !!image && this.unsaved().has(image.asset_id);
  }

  // stores a new picture and gives back the reference to put in the story
  async add(story_id: string, blob: Blob): Promise<AssetRef> {
    const asset_id = crypto.randomUUID();
    const saved = await save_asset({ asset_id, story_id, blob, created_at: Date.now() });
    if (!saved) {
      this.unsaved.update((ids) => new Set(ids).add(asset_id));
    }
    this.show_locally(asset_id, blob);
    return { asset_id, url: null };
  }

  // shows a story's stored pictures, throwing away unused ones over a day old (none if used_asset_ids is null)
  async restore(story_id: string, used_asset_ids: ReadonlySet<string> | null) {
    this.forget_all_local();
    const unused: string[] = [];
    // one map set at the end, instead of copying it for every picture
    const urls = new Map<string, string>();
    for (const asset of await load_story_assets(story_id)) {
      const is_used = !used_asset_ids || used_asset_ids.has(asset.asset_id);
      if (!is_used && Date.now() - asset.created_at > UNUSED_ASSET_LIFETIME) {
        unused.push(asset.asset_id);
      } else {
        urls.set(asset.asset_id, URL.createObjectURL(asset.blob));
      }
    }
    this.local_urls.set(urls);
    await Promise.all(unused.map(delete_asset));
  }

  uploaded(asset_id: string) {
    return this.forget(asset_id);
  }

  // drops a picture's local copy from memory and IndexedDB
  async forget(asset_id: string) {
    const url = this.local_urls().get(asset_id);
    if (url) {
      URL.revokeObjectURL(url);
      this.local_urls.update((urls) => without(urls, asset_id));
    }
    this.unsaved.update((ids) => without_id(ids, asset_id));
    await delete_asset(asset_id);
  }

  private show_locally(asset_id: string, blob: Blob) {
    const url = URL.createObjectURL(blob);
    this.local_urls.update((urls) => new Map(urls).set(asset_id, url));
  }

  // frees every local URL, e.g. when switching stories
  private forget_all_local() {
    for (const url of this.local_urls().values()) {
      URL.revokeObjectURL(url);
    }
    this.local_urls.set(new Map());
    this.unsaved.set(new Set());
  }
}

// a copy of the set without one id (signals need a new set)
function without_id(ids: ReadonlySet<string>, id: string): ReadonlySet<string> {
  const copy = new Set(ids);
  copy.delete(id);
  return copy;
}

// a copy of the map without one key (signals need a new map)
function without(urls: ReadonlyMap<string, string>, key: string): ReadonlyMap<string, string> {
  const copy = new Map(urls);
  copy.delete(key);
  return copy;
}
