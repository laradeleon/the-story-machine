// runs before every test file.

// the test browser (jsdom) has no IndexedDB, so this adds an in-memory one in its place
import 'fake-indexeddb/auto';

// jsdom's own Blob and File can't be copied into IndexedDB, but Node's can (and so can a real browser's).
// swapping them in lets the tests save and load pictures like the real app does.
// getBuiltinModule is used instead of an import because the project has no types for Node's modules
const node_buffer = (
  globalThis as unknown as {
    process: { getBuiltinModule(name: string): { Blob: typeof Blob; File: typeof File } };
  }
).process.getBuiltinModule('node:buffer');
globalThis.Blob = node_buffer.Blob;
globalThis.File = node_buffer.File;

// the test browser can't make real blob: URLs for those files, so each one gets a made-up one instead
let next_blob_url = 0;
URL.createObjectURL = () => `blob:test/${next_blob_url++}`;
URL.revokeObjectURL = () => undefined;
