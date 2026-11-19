// a picture used in a story (character portraits now, backgrounds later).
// this is what's saved in the story: the picture itself is stored separately, under its asset_id
export interface AssetRef {
  asset_id: string; // unique key for the picture, made in the browser when it's added
  url: string | null; // where it is in Azure once uploaded. null while it only exists in this browser
}

// a picture that hasn't been uploaded to Azure yet, kept in the browser's IndexedDB
// so it survives a page reload or closing the browser until it is
export interface PendingAsset {
  asset_id: string; // the same key as in the AssetRef that uses it
  story_id: string; // which story it belongs to, so a story's pictures can be found together
  blob: Blob; // the picture file itself
  created_at: number; // when it was added, in ms since 1970 (from Date.now())
}
