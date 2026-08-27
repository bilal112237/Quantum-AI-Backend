import { config } from '../config/index.js';
import { GoogleDriveStorageAdapter } from './GoogleDriveStorageAdapter.js';
import { LocalStorageAdapter } from './LocalStorageAdapter.js';
import { MongoGridFsStorageAdapter } from './MongoGridFsStorageAdapter.js';
import type { StorageAdapter } from './StorageAdapter.js';

type StorageProvider = 'local' | 'google-drive' | 'mongodb';

/**
 * Resolve the effective provider. Local disk does not work on Vercel
 * (read-only FS except ephemeral /tmp), so fall back to MongoDB GridFS.
 */
export function resolveStorageProvider(): StorageProvider {
  if (config.STORAGE_PROVIDER === 'google-drive') return 'google-drive';
  if (config.STORAGE_PROVIDER === 'mongodb') return 'mongodb';
  if (process.env.VERCEL === '1' || process.env.VERCEL === 'true') {
    console.warn(
      '[storage] STORAGE_PROVIDER=local is not suitable on Vercel; using MongoDB GridFS'
    );
    return 'mongodb';
  }
  return 'local';
}

export function createStorageAdapter(): StorageAdapter {
  const provider = resolveStorageProvider();

  if (provider === 'google-drive') {
    if (
      !config.GOOGLE_DRIVE_FOLDER_ID ||
      !config.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
      !config.GOOGLE_PRIVATE_KEY
    ) {
      throw new Error(
        'Google Drive storage requires GOOGLE_DRIVE_FOLDER_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, and GOOGLE_PRIVATE_KEY'
      );
    }
    return new GoogleDriveStorageAdapter(
      config.GOOGLE_DRIVE_FOLDER_ID,
      config.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      config.GOOGLE_PRIVATE_KEY
    );
  }

  if (provider === 'mongodb') {
    return new MongoGridFsStorageAdapter();
  }

  return new LocalStorageAdapter(config.UPLOAD_DIR);
}

export type { StorageAdapter, StoredObject } from './StorageAdapter.js';
