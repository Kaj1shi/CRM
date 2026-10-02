/** Supplier CRUD mirrored from clients (party check on transactions). */
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityStatus, Prisma, TransactionType } from '@prisma/client';
import { AuditService } from '../common/audit.service';
import { CodesService } from '../common/codes.service';
import { RequestUser } from '../common/decorators';
import { pageMeta } from '../common/dto/page-query.dto';
import { duplicateWarnings } from '../common/duplicates';
import { buildMetrics } from '../common/metrics';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { SupplierDto, SupplierQueryDto } from './suppliers.dto';

const metricSelect = {
  transactionDate: true,
  quantityKg: true,
  inputQuantity: true,
  inputUnit: true,
  status: true,
} satisfies Prisma.TransactionSelect;

@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codes: CodesService,
    private readonly audit: AuditService,
    private readonly settings: SettingsService,
  ) {}

  async list(query: SupplierQueryDto) {
    const where = this.where(query);
    const orderBy = this.order(query.sortBy, query.sortOrder);
    const thresholds = await this.thresholds();
    const include = {
      location: true,
      transactions: { select: metricSelect },
    } as const;
    if (query.frequency) {
      const rows = await this.prisma.supplier.findMany({
        where,
        orderBy,
        include,
      });
      const mapped = rows
        .map((row) => this.withMetrics(row, thresholds))
        .filter((row) => row.frequency === query.frequency);
      const start = (query.page - 1) * query.pageSize;
      return {
        data: mapped.slice(start, start + query.pageSize),
        meta: pageMeta(query.page, query.pageSize, mapped.length),
        message: 'Suppliers loaded.',
      };
    }
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.supplier.count({ where }),
      this.prisma.supplier.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include,
      }),
    ]);
    return {
      data: rows.map((row) => this.withMetrics(row, thresholds)),
      meta: pageMeta(query.page, query.pageSize, total),
      message: 'Suppliers loaded.',
    };
  }

  async get(id: string) {
    const row = await this.prisma.supplier.findUnique({
      where: { id },
      include: { location: true, transactions: { select: metricSelect } },
    });
    if (!row) throw new NotFoundException('Supplier was not found.');
    return this.withMetrics(row, await this.thresholds());
  }

  async create(
    dto: SupplierDto,
    actor: RequestUser,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const existing = await this.prisma.supplier.findMany({
      select: { name: true, phone: true, email: true, supplierCode: true },
    });
    const warnings = duplicateWarnings(
      dto,
      existing.map((row) => ({ ...row, code: row.supplierCode })),
    );
    if (warnings.length > 0 && !dto.confirmDuplicate) {
      throw new ConflictException({
        message: 'Possible duplicate supplier found.',
        errors: { name: warnings[0] },
        warnings,
      });
    }
    const supplier = await this.prisma.$transaction(async (tx) => {
      const supplierCode = await this.codes.nextCode(tx, 'supplier');
      return tx.supplier.create({
        data: {
          supplierCode,
          name: dto.name.trim(),
          contactPerson: dto.contactPerson,
          phone: dto.phone,
          email: dto.email?.toLowerCase(),
          locationId: dto.locationId,
          distanceKm: dto.distanceKm,
          supplierType: dto.supplierType,
          status: actor.role === 'STAFF' ? EntityStatus.ACTIVE : dto.status,
          notes: dto.notes,
        },
        include: { location: true },
      });
    });
    await this.audit.record({
      userId: actor.id,
      action: 'CREATE',
      entity: 'Supplier',
      entityId: supplier.id,
      details: 'Supplier created.',
      newValue: { supplierCode: supplier.supplierCode, name: supplier.name },
      ipAddress,
      userAgent,
    });
    return { supplier, warnings };
  }

  async update(
    id: string,
    dto: SupplierDto,
    actor: RequestUser,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const current = await this.prisma.supplier.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Supplier was not found.');
    if (actor.role === 'STAFF' && dto.status && dto.status !== current.status) {
      throw new ForbiddenException('Staff cannot change supplier status.');
    }
    const supplier = await this.prisma.supplier.update({
      where: { id },
      data: {
        name: dto.name.trim(),
        contactPerson: dto.contactPerson,
        phone: dto.phone,
        email: dto.email?.toLowerCase(),
        locationId: dto.locationId,
        distanceKm: dto.distanceKm,
        supplierType: dto.supplierType,
        status: actor.role === 'STAFF' ? undefined : dto.status,
        notes: dto.notes,
      },
      include: { location: true },
    });
    await this.audit.record({
      userId: actor.id,
      action: 'UPDATE',
      entity: 'Supplier',
      entityId: id,
      details: 'Supplier updated.',
      oldValue: { name: current.name, status: current.status },
      newValue: { name: supplier.name, status: supplier.status },
      ipAddress,
      userAgent,
    });
    return supplier;
  }

  async setStatus(
    id: string,
    status: EntityStatus,
    actor: RequestUser,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const current = await this.prisma.supplier.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Supplier was not found.');
    const supplier = await this.prisma.supplier.update({
      where: { id },
      data: { status },
    });
    await this.audit.record({
      userId: actor.id,
      action: status === EntityStatus.ACTIVE ? 'REACTIVATE' : 'DEACTIVATE',
      entity: 'Supplier',
      entityId: id,
      details: `Supplier status set to ${status}.`,
      oldValue: { status: current.status },
      newValue: { status },
      ipAddress,
      userAgent,
    });
    return supplier;
  }

  transactions(id: string, from?: string, to?: string) {
    return this.prisma.transaction.findMany({
      where: {
        supplierId: id,
        transactionType: TransactionType.SUPPLIER_SUPPLY,
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
    const supplier = await this.get(id);
    return {
      supplierCode: supplier.supplierCode,
      name: supplier.name,
      totalQuantityKg: supplier.totalQuantityKg,
      transactionCount: supplier.transactionCount,
      averageQuantityKg: supplier.averageQuantityKg,
      lastTransactionDate: supplier.lastTransactionDate,
      quantityThisMonthKg: supplier.quantityThisMonthKg,
      quantityThisYearKg: supplier.quantityThisYearKg,
      frequency: supplier.frequency,
      activity: supplier.activity,
    };
  }

  private where(query: SupplierQueryDto): Prisma.SupplierWhereInput {
    const search = query.search?.trim();
    return {
      status: query.status,
      locationId: query.locationId,
      supplierType: query.supplierType,
      OR: search
        ? [
            { supplierCode: { contains: search, mode: 'insensitive' } },
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
  ): Prisma.SupplierOrderByWithRelationInput {
    const allowed = new Set([
      'name',
      'supplierCode',
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
    const supplier = { ...row };
    Reflect.deleteProperty(supplier, 'transactions');
    return { ...supplier, ...metrics };
  }
}
