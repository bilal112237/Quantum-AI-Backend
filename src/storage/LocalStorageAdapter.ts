import fs from 'fs/promises';
import path from 'path';
import { AppError } from '../utils/errors.js';
import type { StorageAdapter, StoredObject } from './StorageAdapter.js';

export class LocalStorageAdapter implements StorageAdapter {
  constructor(private readonly uploadDir: string) {}

  async ensureReady(): Promise<void> {
    if (process.env.VERCEL === '1' || process.env.VERCEL === 'true') {
      throw new AppError(
        500,
        'Local disk uploads are not available on Vercel. Set STORAGE_PROVIDER=mongodb (or google-drive).',
        'STORAGE_UNSUPPORTED'
      );
    }
    await fs.mkdir(this.uploadDir, { recursive: true });
  }

  async put(buffer: Buffer, name: string, _mimeType: string, _userId: string): Promise<StoredObject> {
    await this.ensureReady();
    const key = path.join(this.uploadDir, name);
    await fs.writeFile(key, buffer);
    return { key, provider: 'local' };
  }

  read(key: string): Promise<Buffer> {
    return fs.readFile(key);
  }

  async delete(key: string): Promise<void> {
    await fs.rm(key, { force: true });
  }
}
