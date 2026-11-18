import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import { CLIENT_ORIGIN, PORT } from './config/constants.js';
import { problemRouter } from './routes/problems.js';
import { connectDatabase } from './services/database.js';

const app = express();

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());
app.use('/api/problems', problemRouter);

app.get('/health', (_request, response) => {
  response.json({ status: 'ok' });
});

connectDatabase()
  .catch((error: unknown) => {
    console.error('MongoDB connection failed:', error);
  })
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`VerdictAI server listening on http://localhost:${PORT}`);
    });
  });