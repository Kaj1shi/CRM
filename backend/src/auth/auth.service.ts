/**
 * Auth logic: Argon2id, lockout (5 failures / 15 min), JWT access + hashed refresh.
 * Used by AuthController. Never returns passwordHash.
 */
import { createHash, randomBytes } from 'crypto';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuditAction, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { AuditService } from '../common/audit.service';
import { PrismaService } from '../prisma/prisma.service';

const INVALID_LOGIN = 'The email or password is incorrect.';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
  ) {}

  async login(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { role: true },
    });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(INVALID_LOGIN);
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException(
        'This account is temporarily locked. Try again later.',
      );
    }
    const matches = await argon2.verify(user.passwordHash, password);
    if (!matches) {
      // Failed attempt: increment counter; lock account at 5 for 15 minutes.
      const attempts = user.failedLoginAttempts + 1;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          lockedUntil:
            attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null,
        },
      });
      throw new UnauthorizedException(INVALID_LOGIN);
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });
    await this.audit.record({
      userId: user.id,
      action: AuditAction.LOGIN,
      entity: 'User',
      entityId: user.id,
      details: 'User signed in.',
      ipAddress,
      userAgent,
    });
    return this.issueSession(
      user.id,
      user.fullName,
      user.email,
      user.role.name,
      user.mustChangePassword,
      ipAddress,
      userAgent,
    );
  }

  async refresh(
    refreshToken: string | undefined,
    ipAddress?: string,
    userAgent?: string,
  ) {
    if (!refreshToken) {
      throw new UnauthorizedException(
        'Your session has expired. Please sign in again.',
      );
    }
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      include: { user: { include: { role: true } } },
    });
    if (
      !existing ||
      existing.revokedAt ||
      existing.expiresAt < new Date() ||
      existing.user.status !== UserStatus.ACTIVE
    ) {
      throw new UnauthorizedException(
        'Your session has expired. Please sign in again.',
      );
    }
    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });
    return this.issueSession(
      existing.user.id,
      existing.user.fullName,
      existing.user.email,
      existing.user.role.name,
      existing.user.mustChangePassword,
      ipAddress,
      userAgent,
    );
  }

  async logout(
    refreshToken: string | undefined,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash: hashToken(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    if (userId) {
      await this.audit.record({
        userId,
        action: AuditAction.LOGOUT,
        entity: 'User',
        entityId: userId,
        details: 'User signed out.',
        ipAddress,
        userAgent,
      });
    }
    return { signedOut: true };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (user && user.status === UserStatus.ACTIVE) {
      const token = randomBytes(32).toString('hex');
      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
      if (process.env.NODE_ENV !== 'production') {
        const link = `${process.env.FRONTEND_URL ?? 'http://localhost:5175'}/reset-password?token=${token}`;
        console.info(
          `Development password reset link for ${user.email}: ${link}`,
        );
      }
    }
    return { accepted: true };
  }

  async resetPassword(token: string, password: string) {
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      throw new BadRequestException({
        message: 'Please check the highlighted fields.',
        errors: { password: 'Password must include a letter and a number.' },
      });
    }
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException(
        'This password reset link is invalid or has expired.',
      );
    }
    const passwordHash = await argon2.hash(password);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: {
          passwordHash,
          mustChangePassword: false,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    await this.audit.record({
      userId: record.userId,
      action: AuditAction.PASSWORD_CHANGE,
      entity: 'User',
      entityId: record.userId,
      details: 'Password was reset.',
    });
    return { reset: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      status: user.status,
      role: user.role.name,
      permissions: user.role.permissions.map((item) => item.permission.key),
      lastLoginAt: user.lastLoginAt,
      mustChangePassword: user.mustChangePassword,
    };
  }

  private async issueSession(
    userId: string,
    fullName: string,
    email: string,
    role: 'ADMIN' | 'MANAGER' | 'STAFF',
    mustChangePassword: boolean,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const accessToken = await this.jwt.signAsync(
      { sub: userId },
      { expiresIn: '15m' },
    );
    const refreshToken = randomBytes(48).toString('hex');
    const csrfToken = randomBytes(24).toString('hex');
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress,
        userAgent,
      },
    });
    const permissions = await this.prisma.role.findUniqueOrThrow({
      where: { name: role },
      include: { permissions: { include: { permission: true } } },
    });
    return {
      accessToken,
      refreshToken,
      csrfToken,
      user: {
        id: userId,
        fullName,
        email,
        role,
        permissions: permissions.permissions.map((item) => item.permission.key),
        mustChangePassword,
      },
    };
  }
}
