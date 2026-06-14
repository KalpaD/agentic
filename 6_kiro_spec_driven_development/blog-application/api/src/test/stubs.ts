import { StorageClient } from '../images/storage';

/**
 * A StorageClient that throws if any method is called — handy for tests that
 * exercise the auth, article, or health endpoints and never actually upload.
 * Keeps createApp(db, storage) from blowing up at construction time.
 */
export const explodingStorage: StorageClient = {
  async upload() {
    throw new Error('explodingStorage.upload() should not be called in this test');
  },
  publicUrlFor() {
    throw new Error('explodingStorage.publicUrlFor() should not be called in this test');
  },
};
