import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { authRouter } from './routes/auth';
import { profileRouter } from './routes/profile';

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: ['http://localhost:5173', process.env.CORS_ORIGIN].filter(
      Boolean,
    ) as string[],
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/auth', authRouter);
app.use('/profile', profileRouter);

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  },
);
