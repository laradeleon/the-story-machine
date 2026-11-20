// the story's reference to a picture, which is stored separately under its asset_id
export interface AssetRef {
  asset_id: string; // unique key for the picture, made in the browser when it's added
  url: string | null; // where it is in Azure once uploaded. null while it only exists in this browser
}

// a picture not uploaded to Azure yet, kept in IndexedDB so it survives a reload
export interface PendingAsset {
  asset_id: string; // the same key as in the AssetRef that uses it
  story_id: string; // which story it belongs to, so a story's pictures can be found together
  blob: Blob; // the picture file itself
  created_at: number; // when it was added, in ms since 1970 (from Date.now())
}
