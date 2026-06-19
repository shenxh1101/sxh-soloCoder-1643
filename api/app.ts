import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import eventRoutes from './routes/events.js';
import guestRoutes from './routes/guests.js';
import checkInRoutes from './routes/checkins.js';
import seatRoutes from './routes/seats.js';
import reportRoutes from './routes/reports.js';
import forumRoutes from './routes/forums.js';
import exportRoutes from './routes/export.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app: express.Application = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/events/:eventId/guests', guestRoutes);
app.use('/api/events/:eventId/checkins', checkInRoutes);
app.use('/api/events/:eventId/seats', seatRoutes);
app.use('/api/events/:eventId/reports', reportRoutes);
app.use('/api/events/:eventId/forums', forumRoutes);
app.use('/api/events/:eventId/export', exportRoutes);

app.use(
  '/api/health',
  (_req: Request, res: Response, _next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    });
  },
);

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  });
});

export default app;
