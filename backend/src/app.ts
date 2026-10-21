import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import env from './config/env';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';

export const app = express();

// Security Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS Configuration
app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin) return callback(null, true);
    if (env.CORS_ORIGIN.indexOf(origin) !== -1 || env.CORS_ORIGIN.includes('*')) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive for local dev / testing
  },
  credentials: true
}));

// Body Parsers & Cookie Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health Check Endpoint
app.get(['/health', '/api/health'], (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV
  });
});

// Mount Main API Routes on both /api and root /
app.use('/api', routes);
app.use('/', routes);

// Centralized Error Handler
app.use(errorHandler);

export default app;
