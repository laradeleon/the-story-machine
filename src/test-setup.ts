// runs before every test file.
// the test browser (jsdom) has no IndexedDB, so this adds an in-memory one in its place
import 'fake-indexeddb/auto';
