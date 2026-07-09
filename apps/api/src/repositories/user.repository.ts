import { prisma } from '../lib/prisma'

export const UserRepository = {
  findByEmail: (email: string) => prisma.user.findUnique({ where: { email } }),

  findById: (id: string) =>
    prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, avatarUrl: true },
    }),

  create: (data: { email: string; passwordHash: string; name: string }) =>
    prisma.user.create({ data }),

  // ── Refresh tokens ───────────────────────────────────────────────────────────

  createRefreshToken: (userId: string, tokenHash: string, expiresAt: Date) =>
    prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } }),

  findActiveRefreshToken: (userId: string, tokenHash: string) =>
    prisma.refreshToken.findFirst({
      where: { userId, tokenHash, revoked: false, expiresAt: { gt: new Date() } },
    }),

  revokeRefreshToken: (id: string) =>
    prisma.refreshToken.update({ where: { id }, data: { revoked: true } }),

  revokeAllRefreshTokens: (userId: string) => prisma.refreshToken.deleteMany({ where: { userId } }),

  // ── Password reset tokens ────────────────────────────────────────────────────

  deleteActiveResetTokens: (userId: string) =>
    prisma.passwordResetToken.deleteMany({
      where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
    }),

  createResetToken: (userId: string, tokenHash: string, expiresAt: Date) =>
    prisma.passwordResetToken.create({ data: { userId, tokenHash, expiresAt } }),

  findResetToken: (tokenHash: string) =>
    prisma.passwordResetToken.findUnique({ where: { tokenHash } }),

  // Transaction: update password + mark token used + revoke all sessions atomically
  applyPasswordReset: (userId: string, tokenId: string, passwordHash: string) =>
    prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: tokenId }, data: { usedAt: new Date() } }),
      prisma.refreshToken.deleteMany({ where: { userId } }),
    ]),
}
