/** Record purchases/supplies (kg), reverse as REVERSED, exclude reversed from totals. */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EntityStatus,
  Prisma,
  ProductUnit,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';
import { AuditService } from '../common/audit.service';
import { CodesService } from '../common/codes.service';
import { pageMeta } from '../common/dto/page-query.dto';
import { toStoredQuantity } from '../common/quantity';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import {
  CreateTransactionDto,
  TransactionQueryDto,
  UpdateTransactionDto,
} from './transactions.dto';

const include = {
  client: true,
  supplier: true,
  product: true,
  recordedBy: { select: { id: true, fullName: true } },
};

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codes: CodesService,
    private readonly audit: AuditService,
    private readonly settings: SettingsService,
  ) {}

  async list(query: TransactionQueryDto) {
    const where = this.where(query);
    const [total, data] = await this.prisma.$transaction([
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.findMany({
        where,
        include,
        orderBy: { transactionDate: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return {
      data,
      meta: pageMeta(query.page, query.pageSize, total),
      message: 'Transactions loaded.',
    };
  }

  async get(id: string) {
    const row = await this.prisma.transaction.findUnique({
      where: { id },
      include,
    });
    if (!row) throw new NotFoundException('Transaction was not found.');
    return row;
  }

  async create(
    dto: CreateTransactionDto,
    actorId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    this.assertParty(dto);
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product || product.status !== EntityStatus.ACTIVE)
      throw new BadRequestException('Select an active product.');
    const stored = toStoredQuantity(dto.quantity, dto.unit);
    const limit = await this.settings.number('max_quantity_kg_warning');
    if (
      stored.quantityKg !== null &&
      stored.quantityKg > limit &&
      !dto.acknowledgeLargeQuantity
    ) {
      throw new ConflictException({
        message: 'This quantity is unusually large. Confirm it before saving.',
        errors: { quantity: `Quantities above ${limit} kg need confirmation.` },
      });
    }
    if (dto.transactionType === TransactionType.CLIENT_PURCHASE) {
      const client = await this.prisma.client.findUnique({
        where: { id: dto.clientId },
      });
      if (!client)
        throw new BadRequestException({
          message: 'Select a client.',
          errors: { clientId: 'A client is required for a purchase.' },
        });
    } else {
      const supplier = await this.prisma.supplier.findUnique({
        where: { id: dto.supplierId },
      });
      if (!supplier)
        throw new BadRequestException({
          message: 'Select a supplier.',
          errors: { supplierId: 'A supplier is required for a supply.' },
        });
    }
    const transaction = await this.prisma.$transaction(async (tx) => {
      const transactionCode = await this.codes.nextCode(tx, 'transaction');
      return tx.transaction.create({
        data: {
          transactionCode,
          transactionType: dto.transactionType,
          clientId:
            dto.transactionType === TransactionType.CLIENT_PURCHASE
              ? dto.clientId
              : null,
          supplierId:
            dto.transactionType === TransactionType.SUPPLIER_SUPPLY
              ? dto.supplierId
              : null,
          productId: dto.productId,
          quantityKg: stored.quantityKg,
          inputQuantity: stored.inputQuantity,
          inputUnit: dto.unit,
          transactionDate: new Date(dto.transactionDate),
          referenceNumber: dto.referenceNumber,
          notes: dto.notes,
          recordedById: actorId,
        },
        include,
      });
    });
    await this.audit.record({
      userId: actorId,
      action: 'CREATE',
      entity: 'Transaction',
      entityId: transaction.id,
      details: 'Transaction recorded.',
      newValue: {
        transactionCode: transaction.transactionCode,
        transactionType: transaction.transactionType,
        quantityKg: stored.quantityKg,
      },
      ipAddress,
      userAgent,
    });
    return transaction;
  }

  async update(
    id: string,
    dto: UpdateTransactionDto,
    actorId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const current = await this.get(id);
    if (current.status !== TransactionStatus.RECORDED)
      throw new BadRequestException('A reversed transaction cannot be edited.');
    const transaction = await this.prisma.transaction.update({
      where: { id },
      data: { referenceNumber: dto.referenceNumber, notes: dto.notes },
      include,
    });
    await this.audit.record({
      userId: actorId,
      action: 'UPDATE',
      entity: 'Transaction',
      entityId: id,
      details: 'Transaction reference or notes updated.',
      oldValue: {
        referenceNumber: current.referenceNumber,
        notes: current.notes,
      },
      newValue: {
        referenceNumber: transaction.referenceNumber,
        notes: transaction.notes,
      },
      ipAddress,
      userAgent,
    });
    return transaction;
  }

  async reverse(
    id: string,
    actorId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const current = await this.get(id);
    if (current.status === TransactionStatus.REVERSED)
      throw new BadRequestException(
        'This transaction has already been reversed.',
      );
    const transaction = await this.prisma.transaction.update({
      where: { id },
      data: { status: TransactionStatus.REVERSED },
      include,
    });
    await this.audit.record({
      userId: actorId,
      action: 'UPDATE',
      entity: 'Transaction',
      entityId: id,
      details: 'Transaction reversed and excluded from totals.',
      oldValue: { status: current.status },
      newValue: { status: TransactionStatus.REVERSED },
      ipAddress,
      userAgent,
    });
    return transaction;
  }

  async summary(query: TransactionQueryDto) {
    const rows = await this.prisma.transaction.findMany({
      where: { ...this.where(query), status: TransactionStatus.RECORDED },
      select: { transactionType: true, quantityKg: true, inputUnit: true },
    });
    const weight = (type: TransactionType) =>
      rows
        .filter(
          (row) =>
            row.transactionType === type &&
            (row.inputUnit === ProductUnit.KG ||
              row.inputUnit === ProductUnit.TONNE),
        )
        .reduce((sum, row) => sum + Number(row.quantityKg ?? 0), 0);
    return {
      transactionCount: rows.length,
      purchasedKg:
        Math.round(weight(TransactionType.CLIENT_PURCHASE) * 1000) / 1000,
      suppliedKg:
        Math.round(weight(TransactionType.SUPPLIER_SUPPLY) * 1000) / 1000,
    };
  }

  private assertParty(dto: CreateTransactionDto) {
    if (dto.transactionType === TransactionType.CLIENT_PURCHASE) {
      if (!dto.clientId || dto.supplierId)
        throw new BadRequestException({
          message: 'A client purchase must have a client and no supplier.',
          errors: {
            clientId: 'Select a client.',
            supplierId: 'Leave the supplier empty.',
          },
        });
    } else if (!dto.supplierId || dto.clientId) {
      throw new BadRequestException({
        message: 'A supplier supply must have a supplier and no client.',
        errors: {
          supplierId: 'Select a supplier.',
          clientId: 'Leave the client empty.',
        },
      });
    }
  }

  private where(query: TransactionQueryDto): Prisma.TransactionWhereInput {
    const search = query.search?.trim();
    return {
      transactionType: query.transactionType,
      clientId: query.clientId,
      supplierId: query.supplierId,
      productId: query.productId,
      transactionDate: {
        gte: query.from ? new Date(query.from) : undefined,
        lte: query.to ? new Date(query.to) : undefined,
      },
      OR: search
        ? [
            { transactionCode: { contains: search, mode: 'insensitive' } },
            { referenceNumber: { contains: search, mode: 'insensitive' } },
            { client: { name: { contains: search, mode: 'insensitive' } } },
            { supplier: { name: { contains: search, mode: 'insensitive' } } },
            { product: { name: { contains: search, mode: 'insensitive' } } },
          ]
        : undefined,
    };
  }
}
