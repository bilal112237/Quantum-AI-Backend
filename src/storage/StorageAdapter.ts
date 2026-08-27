export interface StoredObject {
  key: string;
  provider: 'local' | 'google-drive' | 'mongodb';
}

export interface StorageAdapter {
  ensureReady(): Promise<void>;
  put(buffer: Buffer, name: string, mimeType: string, userId: string): Promise<StoredObject>;
  read(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}
