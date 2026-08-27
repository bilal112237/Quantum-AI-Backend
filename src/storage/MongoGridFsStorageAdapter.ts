import mongoose from 'mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';
import type { StorageAdapter, StoredObject } from './StorageAdapter.js';

/**
 * Durable file storage for serverless (Vercel). Local disk is read-only /
 * ephemeral there; GridFS keeps uploads in the same MongoDB used by the app.
 */
export class MongoGridFsStorageAdapter implements StorageAdapter {
  private static readonly BUCKET = 'ai_uploads';

  private bucket(): GridFSBucket {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('MongoDB is not connected — cannot use GridFS storage');
    }
    return new GridFSBucket(db, { bucketName: MongoGridFsStorageAdapter.BUCKET });
  }

  async ensureReady(): Promise<void> {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB is not connected — cannot use GridFS storage');
    }
  }

  async put(buffer: Buffer, name: string, mimeType: string, userId: string): Promise<StoredObject> {
    await this.ensureReady();
    const bucket = this.bucket();
    const uploadStream = bucket.openUploadStream(name, {
      contentType: mimeType,
      metadata: { quantumAiUserId: userId },
    });

    await new Promise<void>((resolve, reject) => {
      uploadStream.once('error', reject);
      uploadStream.once('finish', () => resolve());
      uploadStream.end(buffer);
    });

    return { key: String(uploadStream.id), provider: 'mongodb' };
  }

  async read(key: string): Promise<Buffer> {
    await this.ensureReady();
    if (!ObjectId.isValid(key)) {
      throw new Error(`Invalid GridFS file id: ${key}`);
    }
    const bucket = this.bucket();
    const chunks: Buffer[] = [];
    const downloadStream = bucket.openDownloadStream(new ObjectId(key));

    return new Promise((resolve, reject) => {
      downloadStream.on('data', (chunk: Buffer | Uint8Array) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      downloadStream.once('error', reject);
      downloadStream.once('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  async delete(key: string): Promise<void> {
    await this.ensureReady();
    if (!ObjectId.isValid(key)) return;
    try {
      await this.bucket().delete(new ObjectId(key));
    } catch (error) {
      // Already deleted / missing file should not fail document cleanup.
      const message = error instanceof Error ? error.message : String(error);
      if (!/FileNotFound|not found/i.test(message)) throw error;
    }
  }
}
