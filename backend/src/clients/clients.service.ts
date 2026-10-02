/** Client CRUD, codes, metrics, frequency/activity — soft deactivate via DELETE. */
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClientStatus, Prisma, TransactionType } from '@prisma/client';
import { AuditService } from '../common/audit.service';
import { CodesService } from '../common/codes.service';
import { pageMeta } from '../common/dto/page-query.dto';
import { duplicateWarnings } from '../common/duplicates';
import { RequestUser } from '../common/decorators';
import { buildMetrics } from '../common/metrics';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { ClientDto, ClientQueryDto } from './clients.dto';

const metricSelect = {
  transactionDate: true,
  quantityKg: true,
  inputQuantity: true,
  inputUnit: true,
  status: true,
} satisfies Prisma.TransactionSelect;

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codes: CodesService,
    private readonly audit: AuditService,
    private readonly settings: SettingsService,
  ) {}

  async list(query: ClientQueryDto) {
    const where = this.where(query);
    const orderBy = this.order(query.sortBy, query.sortOrder);
    const thresholds = await this.thresholds();
    if (query.frequency) {
      const rows = await this.prisma.client.findMany({
        where,
        orderBy,
        include: { location: true, transactions: { select: metricSelect } },
      });
      const mapped = rows
        .map((row) => this.withMetrics(row, thresholds))
        .filter((row) => row.frequency === query.frequency);
      const start = (query.page - 1) * query.pageSize;
      return {
        data: mapped.slice(start, start + query.pageSize),
        meta: pageMeta(query.page, query.pageSize, mapped.length),
        message: 'Clients loaded.',
      };
    }
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.client.count({ where }),
      this.prisma.client.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { location: true, transactions: { select: metricSelect } },
      }),
    ]);
    return {
      data: rows.map((row) => this.withMetrics(row, thresholds)),
      meta: pageMeta(query.page, query.pageSize, total),
      message: 'Clients loaded.',
    };
  }

  async get(id: string) {
    const row = await this.prisma.client.findUnique({
      where: { id },
      include: { location: true, transactions: { select: metricSelect } },
    });
    if (!row) throw new NotFoundException('Client was not found.');
    return this.withMetrics(row, await this.thresholds());
  }

  async create(
    dto: ClientDto,
    actor: RequestUser,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const warnings = await this.warningsFor(dto);
    if (warnings.length > 0 && !dto.confirmDuplicate) {
      throw new ConflictException({
        message: 'Possible duplicate client found.',
        errors: { name: warnings[0] },
        warnings,
      });
    }
    const client = await this.prisma.$transaction(async (tx) => {
      const clientCode = await this.codes.nextCode(tx, 'client');
      return tx.client.create({
        data: {
          clientCode,
          name: dto.name.trim(),
          contactPerson: dto.contactPerson,
          phone: dto.phone,
          email: dto.email?.toLowerCase(),
          locationId: dto.locationId,
          distanceKm: dto.distanceKm,
          clientType: dto.clientType,
          status: actor.role === 'STAFF' ? ClientStatus.ACTIVE : dto.status,
          notes: dto.notes,
        },
        include: { location: true },
      });
    });
    await this.audit.record({
      userId: actor.id,
      action: 'CREATE',
      entity: 'Client',
      entityId: client.id,
      details: 'Client created.',
      newValue: { clientCode: client.clientCode, name: client.name },
      ipAddress,
      userAgent,
    });
    return { client, warnings };
  }

  async update(
    id: string,
    dto: ClientDto,
    actor: RequestUser,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const current = await this.prisma.client.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Client was not found.');
    if (actor.role === 'STAFF' && dto.status && dto.status !== current.status) {
      throw new ForbiddenException('Staff cannot change client status.');
    }
    const client = await this.prisma.client.update({
      where: { id },
      data: {
        name: dto.name.trim(),
        contactPerson: dto.contactPerson,
        phone: dto.phone,
        email: dto.email?.toLowerCase(),
        locationId: dto.locationId,
        distanceKm: dto.distanceKm,
        clientType: dto.clientType,
        status: actor.role === 'STAFF' ? undefined : dto.status,
        notes: dto.notes,
      },
      include: { location: true },
    });
    await this.audit.record({
      userId: actor.id,
      action: 'UPDATE',
      entity: 'Client',
      entityId: id,
      details: 'Client updated.',
      oldValue: { name: current.name, status: current.status },
      newValue: { name: client.name, status: client.status },
      ipAddress,
      userAgent,
    });
    return client;
  }

  async setStatus(
    id: string,
    status: ClientStatus,
    actor: RequestUser,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const current = await this.prisma.client.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Client was not found.');
    const client = await this.prisma.client.update({
      where: { id },
      data: { status },
    });
    await this.audit.record({
      userId: actor.id,
      action: status === ClientStatus.ACTIVE ? 'REACTIVATE' : 'DEACTIVATE',
      entity: 'Client',
      entityId: id,
      details: `Client status set to ${status}.`,
      oldValue: { status: current.status },
      newValue: { status },
      ipAddress,
      userAgent,
    });
    return client;
  }

  async transactions(id: string, from?: string, to?: string) {
    await this.get(id);
    return this.prisma.transaction.findMany({
      where: {
        clientId: id,
        transactionType: TransactionType.CLIENT_PURCHASE,
        transactionDate: {
          gte: from ? new Date(from) : undefined,
          lte: to ? new Date(to) : undefined,
        },
      },
      include: { product: true, recordedBy: { select: { fullName: true } } },
      orderBy: { transactionDate: 'desc' },
    });
  }

  async summary(id: string) {
    const client = await this.get(id);
    return {
      clientCode: client.clientCode,
      name: client.name,
      totalQuantityKg: client.totalQuantityKg,
      transactionCount: client.transactionCount,
      averageQuantityKg: client.averageQuantityKg,
      lastTransactionDate: client.lastTransactionDate,
      quantityThisMonthKg: client.quantityThisMonthKg,
      quantityThisYearKg: client.quantityThisYearKg,
      frequency: client.frequency,
      activity: client.activity,
    };
  }

  private async warningsFor(dto: ClientDto) {
    const existing = await this.prisma.client.findMany({
      select: { name: true, phone: true, email: true, clientCode: true },
    });
    return duplicateWarnings(
      dto,
      existing.map((row) => ({ ...row, code: row.clientCode })),
    );
  }

  private where(query: ClientQueryDto): Prisma.ClientWhereInput {
    const search = query.search?.trim();
    return {
      status: query.status,
      locationId: query.locationId,
      clientType: query.clientType,
      OR: search
        ? [
            { clientCode: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
            { contactPerson: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { location: { name: { contains: search, mode: 'insensitive' } } },
          ]
        : undefined,
    };
  }

  private order(
    sortBy: string | undefined,
    sortOrder: 'asc' | 'desc',
  ): Prisma.ClientOrderByWithRelationInput {
    const allowed = new Set([
      'name',
      'clientCode',
      'distanceKm',
      'createdAt',
      'status',
    ]);
    if (sortBy && allowed.has(sortBy)) return { [sortBy]: sortOrder };
    return { createdAt: 'desc' };
  }

  private async thresholds() {
    return {
      inactiveAfterDays: await this.settings.number('inactive_after_days'),
      dormantAfterDays: await this.settings.number('dormant_after_days'),
    };
  }

  private withMetrics<
    T extends { transactions: Parameters<typeof buildMetrics>[0] },
  >(
    row: T,
    thresholds: { inactiveAfterDays: number; dormantAfterDays: number },
  ) {
    const metrics = buildMetrics(
      row.transactions,
      new Date(),
      thresholds.inactiveAfterDays,
      thresholds.dormantAfterDays,
    );
    const client = { ...row };
    Reflect.deleteProperty(client, 'transactions');
    return { ...client, ...metrics };
  }
}
