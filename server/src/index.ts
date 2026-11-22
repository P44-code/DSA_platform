import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import './config/env.js';
import { getPort } from './config/constants.js';
import { problemRouter } from './routes/problems.js';
import { submissionRouter } from './routes/submissions.js';
import { authRouter } from './routes/auth.js';
import { connectDatabase } from './services/database.js';
const app = express();

const port = getPort();
const configuredOrigins = (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const localOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

app.use(cors({
  credentials: true,
  origin: (origin, callback) => {
    if (
      !origin ||
      configuredOrigins.includes(origin) ||
      (process.env.NODE_ENV !== 'production' && localOriginPattern.test(origin))
    ) {
      callback(null, true);
      return;
    }
    callback(new Error(`Origin not allowed: ${origin}`));
  },
}));
app.use(express.json({ limit: '64kb' }));
app.use('/api/problems', problemRouter);
app.use('/api/submissions', submissionRouter);
app.use('/api/auth', authRouter);

app.get('/health', (_request, response) => {
  response.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

app.use((error: unknown, _request: express.Request, response: express.Response, next: express.NextFunction) => {
  if (response.headersSent) {
    next(error);
    return;
  }
  if (process.env.NODE_ENV !== 'production') {
    console.error(error);
  }
  response.status(400).json({
    error: 'Invalid request',
  });
});

async function startServer() {
  const databaseRequired = process.env.NODE_ENV === 'production';

  try {
    await connectDatabase({ required: databaseRequired });
  } catch (error: unknown) {
    console.error('MongoDB connection failed:', error instanceof Error ? error.message : 'Unknown database error');
    if (databaseRequired) {
      process.exitCode = 1;
      return;
    }
  }

  app.listen(port, () => {
    console.log(`VerdictAI server listening on http://localhost:${port}`);
  });
}

void startServer();