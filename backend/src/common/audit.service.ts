import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const SECRET_KEYS = new Set([
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'tokenHash',
]);

function sanitize(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item)) as Prisma.InputJsonValue;
  }
  const output: Record<string, Prisma.InputJsonValue | null> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_KEYS.has(key)) continue;
    const cleaned = sanitize(entry);
    output[key] = cleaned === undefined ? null : cleaned;
  }
  return output;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: {
    userId?: string | null;
    action: AuditAction;
    entity: string;
    entityId?: string | null;
    details?: string;
    oldValue?: unknown;
    newValue?: unknown;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        details: input.details,
        oldValue: sanitize(input.oldValue),
        newValue: sanitize(input.newValue),
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  }
}
