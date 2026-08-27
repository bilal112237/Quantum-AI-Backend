import mongoose, { Schema, Document } from 'mongoose';

export interface IDocumentFile extends Document {
  userId: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  extension: string;
  storagePath: string;
  storageProvider?: 'local' | 'google-drive' | 'mongodb';
  storageKey?: string;
  extractedText?: string;
  wordCount?: number;
  pageCount?: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<IDocumentFile>(
  {
    userId: { type: String, required: true, index: true },
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    extension: { type: String, required: true },
    storagePath: { type: String, required: true },
    storageProvider: {
      type: String,
      enum: ['local', 'google-drive', 'mongodb'],
      default: 'local',
    },
    storageKey: { type: String },
    extractedText: { type: String },
    wordCount: { type: Number },
    pageCount: { type: Number },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

documentSchema.index({ userId: 1, createdAt: -1 });

export const AiDocument = mongoose.model<IDocumentFile>('AiDocument', documentSchema);
