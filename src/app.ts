import express, { type RequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index.js';
import routes from './routes/index.js';
import { globalRateLimiter, errorHandler, notFoundHandler } from './middleware/index.js';

/** Helmet's CJS typings are not callable under NodeNext + TS 5.9; runtime default export is fine. */
const applyHelmet = helmet as unknown as () => RequestHandler;

export function createApp() {
  const app = express();

  // Vercel (and other reverse proxies) set X-Forwarded-For. Without this,
  // express-rate-limit throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR on every request.
  app.set('trust proxy', 1);

  app.use(applyHelmet());
  // Always allow known Quantum product frontends, then merge CORS_ORIGIN.
  // Stale Vercel env without chat.quantumlogicslimited.com used to block
  // QuantumChat → QuantumAI requests (preflight 204 with no Allow-Origin).
  const allowedOrigins = [
    ...new Set(
      [
        'http://localhost:5173',
        'http://localhost:5175',
        'https://chat.quantumlogicslimited.com',
        'https://ai.quantumlogicslimited.com',
        'https://quantum-chat.vercel.app',
        'https://quantum-ai-frontend.vercel.app',
        ...String(config.CORS_ORIGIN || '')
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
      ]
    ),
  ];
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id'],
      optionsSuccessStatus: 204,
    })
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(globalRateLimiter);

  app.get('/', (_req, res) => {
    res.json({
      success: true,
      data: {
        name: 'Quantum AI Assistant API',
        version: '1.0.0',
        docs: '/api/v1/health',
        prefix: config.API_PREFIX,
      },
    });
  });

  app.use(config.API_PREFIX, routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

/** Vercel Express auto-detect requires a default export (function or server). */
const app = createApp();
export default app;
