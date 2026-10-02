/** Aggregates for summary cards, charts, recent txns, and inactivity alerts. */
import { Injectable } from '@nestjs/common';
import {
  ClientStatus,
  EntityStatus,
  ProductUnit,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';
import { classifyFrequency } from '../common/frequency';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  async summary() {
    const now = new Date();
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const [
      clients,
      activeClients,
      suppliers,
      activeSuppliers,
      products,
      monthTransactions,
    ] = await Promise.all([
      this.prisma.client.count(),
      this.prisma.client.count({ where: { status: ClientStatus.ACTIVE } }),
      this.prisma.supplier.count(),
      this.prisma.supplier.count({ where: { status: EntityStatus.ACTIVE } }),
      this.prisma.product.count({ where: { status: EntityStatus.ACTIVE } }),
      this.prisma.transaction.findMany({
        where: {
          transactionDate: { gte: start },
          status: TransactionStatus.RECORDED,
        },
        select: { transactionType: true, quantityKg: true, inputUnit: true },
      }),
    ]);
    const sum = (type: TransactionType) =>
      monthTransactions
        .filter(
          (row) =>
            row.transactionType === type &&
            (row.inputUnit === ProductUnit.KG ||
              row.inputUnit === ProductUnit.TONNE),
        )
        .reduce((total, row) => total + Number(row.quantityKg ?? 0), 0);
    return {
      totalClients: clients,
      activeClients,
      totalSuppliers: suppliers,
      activeSuppliers,
      totalProducts: products,
      transactionsThisMonth: monthTransactions.length,
      quantityPurchasedThisMonthKg: sum(TransactionType.CLIENT_PURCHASE),
      quantitySuppliedThisMonthKg: sum(TransactionType.SUPPLIER_SUPPLY),
    };
  }

  recent() {
    return this.prisma.transaction.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: {
        client: true,
        supplier: true,
        product: true,
        recordedBy: { select: { fullName: true } },
      },
    });
  }

  async trends() {
    const rows = await this.prisma.transaction.findMany({
      where: { status: TransactionStatus.RECORDED },
      select: {
        transactionDate: true,
        transactionType: true,
        quantityKg: true,
        inputUnit: true,
        client: { select: { location: { select: { name: true } } } },
      },
    });
    const months = new Map<
      string,
      {
        month: string;
        purchasedKg: number;
        suppliedKg: number;
        transactions: number;
      }
    >();
    const locations = new Map<string, number>();
    for (const row of rows) {
      const key = row.transactionDate.toISOString().slice(0, 7);
      const bucket = months.get(key) ?? {
        month: key,
        purchasedKg: 0,
        suppliedKg: 0,
        transactions: 0,
      };
      bucket.transactions += 1;
      if (
        row.inputUnit === ProductUnit.KG ||
        row.inputUnit === ProductUnit.TONNE
      ) {
        const qty = Number(row.quantityKg ?? 0);
        if (row.transactionType === TransactionType.CLIENT_PURCHASE)
          bucket.purchasedKg += qty;
        else bucket.suppliedKg += qty;
      }
      months.set(key, bucket);
      const location = row.client?.location?.name;
      if (location && row.transactionType === TransactionType.CLIENT_PURCHASE)
        locations.set(location, (locations.get(location) ?? 0) + 1);
    }
    const clients = await this.prisma.client.findMany({
      include: {
        transactions: {
          where: {
            status: TransactionStatus.RECORDED,
            transactionType: TransactionType.CLIENT_PURCHASE,
          },
          select: { transactionDate: true },
        },
      },
    });
    const frequency = {
      MULTIPLE_PER_WEEK: 0,
      WEEKLY: 0,
      BIWEEKLY: 0,
      MONTHLY: 0,
      IRREGULAR: 0,
      INSUFFICIENT_DATA: 0,
    };
    for (const client of clients)
      frequency[
        classifyFrequency(
          client.transactions.map((item) => item.transactionDate),
        )
      ] += 1;
    return {
      months: [...months.values()].sort((a, b) =>
        a.month.localeCompare(b.month),
      ),
      locations: [...locations.entries()].map(([name, count]) => ({
        name,
        count,
      })),
      frequency: Object.entries(frequency).map(([name, count]) => ({
        name,
        count,
      })),
    };
  }

  async alerts() {
    const inactiveAfter = await this.settings.number('inactive_after_days');
    const cutoff = new Date(Date.now() - inactiveAfter * 24 * 60 * 60 * 1000);
    const recentClients = await this.prisma.client.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    const clients = await this.prisma.client.findMany({
      where: { status: ClientStatus.ACTIVE },
      include: {
        transactions: {
          where: {
            status: TransactionStatus.RECORDED,
            transactionType: TransactionType.CLIENT_PURCHASE,
          },
          orderBy: { transactionDate: 'desc' },
          take: 1,
        },
      },
    });
    const inactive = clients
      .filter(
        (client) =>
          !client.transactions[0] ||
          client.transactions[0].transactionDate < cutoff,
      )
      .slice(0, 5)
      .map((client) => ({
        id: client.id,
        name: client.name,
        clientCode: client.clientCode,
        lastPurchase: client.transactions[0]?.transactionDate ?? null,
      }));
    const recentSupply = await this.prisma.transaction.findMany({
      where: {
        transactionType: TransactionType.SUPPLIER_SUPPLY,
        status: TransactionStatus.RECORDED,
      },
      orderBy: { transactionDate: 'desc' },
      take: 5,
      include: { supplier: true },
    });
    return {
      inactiveClients: inactive,
      recentClients,
      recentSupply,
      note: 'These alerts are rule-based classifications from transaction history.',
    };
  }
}
