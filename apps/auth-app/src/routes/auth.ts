import { Router } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import {
  RegisterSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  ActivateSchema,
} from '@gather/shared';
import { prisma } from '../lib/prisma';
import {
  signAccessToken,
  signRefreshToken,
  hashToken,
  verifyRefreshToken,
} from '../lib/jwt';
import { requireAuth, requireGuest, AuthRequest } from '../middleware/auth';
import { sendActivationEmail, sendPasswordResetEmail } from '../lib/email';

export const authRouter = Router();

function setRefreshCookie(res: import('express').Response, token: string) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

async function issueTokens(userId: string, res: import('express').Response) {
  const accessToken = signAccessToken(userId);
  const refreshToken = signRefreshToken(userId);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  setRefreshCookie(res, refreshToken);
  return accessToken;
}

// ─── POST /auth/register ─────────────────────────────────────────────────────
// Creates user (isActive=false), sends activation email, returns NO tokens
authRouter.post('/register', requireGuest, async (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { email, password, name } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, passwordHash, name },
  });

  const rawToken = crypto.randomBytes(32).toString('hex');
  await prisma.activationToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
  });

  await sendActivationEmail(email, rawToken);

  return res.status(201).json({
    message:
      'Registration successful. Please check your email to activate your account.',
  });
});

// ─── POST /auth/activate ──────────────────────────────────────────────────────
// Validates activation token, sets isActive=true, issues tokens
authRouter.post('/activate', async (req, res) => {
  const parsed = ActivateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { token } = parsed.data;

  const stored = await prisma.activationToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
    return res
      .status(400)
      .json({ error: 'This activation link is invalid or has expired.' });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: stored.userId },
      data: { isActive: true },
    }),
    prisma.activationToken.update({
      where: { id: stored.id },
      data: { usedAt: new Date() },
    }),
  ]);

  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const accessToken = await issueTokens(user.id, res);
  return res.json({
    accessToken,
    user: { id: user.id, email: user.email, name: user.name },
  });
});

// ─── POST /auth/login ─────────────────────────────────────────────────────────
authRouter.post('/login', requireGuest, async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (!user.isActive) {
    return res
      .status(403)
      .json({ error: 'Account not activated. Please check your email.' });
  }

  const accessToken = await issueTokens(user.id, res);
  return res.json({
    accessToken,
    user: { id: user.id, email: user.email, name: user.name },
  });
});

// ─── POST /auth/refresh ───────────────────────────────────────────────────────
authRouter.post('/refresh', async (req, res) => {
  const token = req.cookies?.refreshToken as string | undefined;
  if (!token) {
    return res.status(401).json({ error: 'No refresh token' });
  }

  let userId: string;
  try {
    userId = verifyRefreshToken(token).userId;
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }

  const stored = await prisma.refreshToken.findFirst({
    where: {
      userId,
      tokenHash: hashToken(token),
      revoked: false,
      expiresAt: { gt: new Date() },
    },
  });
  if (!stored) {
    return res.status(401).json({ error: 'Refresh token revoked or expired' });
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revoked: true },
  });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(401).json({ error: 'User not found' });

  const accessToken = await issueTokens(userId, res);
  return res.json({
    accessToken,
    user: { id: user.id, email: user.email, name: user.name },
  });
});

// ─── POST /auth/logout ────────────────────────────────────────────────────────
authRouter.post('/logout', requireAuth, async (req, res) => {
  const { userId } = req as AuthRequest;
  await prisma.refreshToken.deleteMany({ where: { userId } });
  res.clearCookie('refreshToken');
  return res.status(204).send();
});

// ─── GET /auth/me ─────────────────────────────────────────────────────────────
authRouter.get('/me', requireAuth, async (req, res) => {
  const { userId } = req as AuthRequest;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json(user);
});

// ─── POST /auth/forgot-password ───────────────────────────────────────────────
authRouter.post('/forgot-password', async (req, res) => {
  const parsed = ForgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { email } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const rawToken = crypto.randomBytes(32).toString('hex');

    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
    });

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    try {
      await sendPasswordResetEmail(email, rawToken);
    } catch (err) {
      console.error('Failed to send password reset email:', err);
    }
  }

  return res.json({
    message: 'If that email is registered, you will receive a reset link.',
  });
});

// ─── POST /auth/reset-password ────────────────────────────────────────────────
authRouter.post('/reset-password', async (req, res) => {
  const parsed = ResetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { token, password } = parsed.data;

  const stored = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
    return res
      .status(400)
      .json({ error: 'This reset link is invalid or has expired.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: stored.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: stored.id },
      data: { usedAt: new Date() },
    }),
    prisma.refreshToken.deleteMany({ where: { userId: stored.userId } }),
  ]);

  return res.json({ message: 'Password reset successfully.' });
});
