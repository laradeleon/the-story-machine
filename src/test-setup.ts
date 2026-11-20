// runs before every test file.

// the test browser (jsdom) has no IndexedDB, so this adds an in-memory one in its place
import 'fake-indexeddb/auto';

// jsdom's Blob and File can't go into IndexedDB but Node's can (no import, the project has no Node types)
const node_buffer = (
  globalThis as unknown as {
    process: { getBuiltinModule(name: string): { Blob: typeof Blob; File: typeof File } };
  }
).process.getBuiltinModule('node:buffer');
globalThis.Blob = node_buffer.Blob;
globalThis.File = node_buffer.File;

// jsdom can't make blob: URLs, so each file gets a made-up one
let next_blob_url = 0;
URL.createObjectURL = () => `blob:test/${next_blob_url++}`;
URL.revokeObjectURL = () => undefined;
