import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env first, then override with .env.production when NODE_ENV=production
dotenv.config();
if (process.env.NODE_ENV === 'production') {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.production'), override: true });
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5001),
  API_PREFIX: z.string().default('/api/v1'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  GROQ_API_KEY: z.string().min(1, 'GROQ_API_KEY is required'),
  GROQ_BASE_URL: z.string().url().default('https://api.groq.com/openai/v1'),
  GROQ_CHAT_MODEL: z.string().default('llama-3.3-70b-versatile'),
  GROQ_VISION_MODEL: z.string().default('meta-llama/llama-4-scout-17b-16e-instruct'),
  GROQ_MAX_COMPLETION_TOKENS: z.coerce.number().default(4096),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_ISSUER: z.string().default('quantum-ai'),
  // Shared with QuantumChat-Backend for signing AI response receipts.
  // Empty strings (e.g. unset CI secrets) are treated as missing.
  QUANTUM_AI_SERVICE_SECRET: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : v),
    z
      .string({ required_error: 'Required' })
      .min(32, 'QUANTUM_AI_SERVICE_SECRET must be at least 32 characters')
  ),
  AUTH_REQUIRED: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  // local = disk (dev only); mongodb = GridFS (recommended on Vercel);
  // google-drive = optional remote Drive folder.
  STORAGE_PROVIDER: z.enum(['local', 'google-drive', 'mongodb']).default('local'),
  UPLOAD_DIR: z.string().default('./uploads'),
  GOOGLE_DRIVE_FOLDER_ID: z.string().optional(),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().email().optional(),
  GOOGLE_PRIVATE_KEY: z.string().optional(),
  MAX_EXTRACTED_TEXT_CHARS: z.coerce.number().positive().default(500_000),
  MAX_FILE_SIZE_MB: z.coerce.number().default(25),
  MAX_FILES_PER_REQUEST: z.coerce.number().default(10),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900_000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  AI_RATE_LIMIT_MAX: z.coerce.number().default(30),
  UPSTASH_REDIS_REST_URL: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : v),
    z.string().url().optional()
  ),
  UPSTASH_REDIS_REST_TOKEN: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : v),
    z.string().optional()
  ),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.flatten().fieldErrors;
  // During Vercel build the serverless bundle may evaluate imports before env vars are injected.
  // Don't kill the build process; fail clearly at request time instead.
  if (process.env.VERCEL === '1') {
    console.warn('Invalid environment configuration (deferred for Vercel):', details);
  } else {
    console.error('Invalid environment configuration:', details);
    process.exit(1);
  }
}

const fallback = {
  NODE_ENV: 'production' as const,
  PORT: 5001,
  API_PREFIX: '/api/v1',
  MONGODB_URI: process.env.MONGODB_URI ?? '',
  GROQ_API_KEY: process.env.GROQ_API_KEY ?? '',
  GROQ_BASE_URL: 'https://api.groq.com/openai/v1',
  GROQ_CHAT_MODEL: 'llama-3.3-70b-versatile',
  GROQ_VISION_MODEL: 'meta-llama/llama-4-scout-17b-16e-instruct',
  GROQ_MAX_COMPLETION_TOKENS: 4096,
  JWT_SECRET: process.env.JWT_SECRET ?? 'vercel-build-placeholder-secret',
  JWT_ISSUER: 'quantum-ai',
  QUANTUM_AI_SERVICE_SECRET: process.env.QUANTUM_AI_SERVICE_SECRET || 'vercel-build-placeholder-service-secret',
  AUTH_REQUIRED: false,
  STORAGE_PROVIDER: (process.env.VERCEL ? 'mongodb' : 'local') as 'local' | 'mongodb',
  UPLOAD_DIR: './uploads',
  GOOGLE_DRIVE_FOLDER_ID: undefined as string | undefined,
  GOOGLE_SERVICE_ACCOUNT_EMAIL: undefined as string | undefined,
  GOOGLE_PRIVATE_KEY: undefined as string | undefined,
  MAX_EXTRACTED_TEXT_CHARS: 500_000,
  MAX_FILE_SIZE_MB: 25,
  MAX_FILES_PER_REQUEST: 10,
  RATE_LIMIT_WINDOW_MS: 900_000,
  RATE_LIMIT_MAX: 100,
  AI_RATE_LIMIT_MAX: 30,
  UPSTASH_REDIS_REST_URL: undefined as string | undefined,
  UPSTASH_REDIS_REST_TOKEN: undefined as string | undefined,
  CORS_ORIGIN: 'http://localhost:5173',
  LOG_LEVEL: 'info' as const,
};

const data = parsed.success ? parsed.data : fallback;

export const config = {
  ...data,
  isProduction: data.NODE_ENV === 'production',
  maxFileSizeBytes: data.MAX_FILE_SIZE_MB * 1024 * 1024,
};

export type AppConfig = typeof config;