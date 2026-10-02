import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../common/audit.service';
import { PrismaService } from '../prisma/prisma.service';

export const DEFAULT_SETTINGS: Record<string, Prisma.InputJsonValue> = {
  inactive_after_days: 30,
  dormant_after_days: 90,
  max_quantity_kg_warning: 100000,
  factory_name: 'Kampala Industrial Area',
  timezone: 'Africa/Kampala',
  client_code_prefix: 'CL',
  supplier_code_prefix: 'SUP',
  transaction_code_prefix: 'TXN',
};

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getAll() {
    const rows = await this.prisma.setting.findMany();
    const values: Record<string, Prisma.JsonValue> = {
      ...DEFAULT_SETTINGS,
    } as Record<string, Prisma.JsonValue>;
    for (const row of rows) values[row.key] = row.value;
    return values;
  }

  async number(
    key:
      'inactive_after_days' | 'dormant_after_days' | 'max_quantity_kg_warning',
  ): Promise<number> {
    const values = await this.getAll();
    const value = Number(values[key]);
    return Number.isFinite(value) ? value : Number(DEFAULT_SETTINGS[key]);
  }

  async update(
    changes: Record<string, Prisma.InputJsonValue>,
    actorId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const before = await this.getAll();
    for (const [key, value] of Object.entries(changes)) {
      if (!(key in DEFAULT_SETTINGS)) continue;
      await this.prisma.setting.upsert({
        where: { key },
        create: { key, value, updatedBy: actorId },
        update: { value, updatedBy: actorId },
      });
    }
    const after = await this.getAll();
    await this.audit.record({
      userId: actorId,
      action: 'UPDATE',
      entity: 'Setting',
      details: 'System settings updated.',
      oldValue: before,
      newValue: after,
      ipAddress,
      userAgent,
    });
    return after;
  }
}
