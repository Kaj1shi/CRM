/** Filterable operational/management reports + CSV/Excel/PDF export payloads. */
import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  ClientStatus,
  EntityStatus,
  Prisma,
  ProductUnit,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { classifyFrequency } from '../common/frequency';
import { AuditService } from '../common/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { RequestUser } from '../common/decorators';

type Filters = {
  from?: string;
  to?: string;
  status?: string;
  locationId?: string;
  transactionType?: TransactionType;
  clientId?: string;
  supplierId?: string;
  productId?: string;
  format?: string;
};

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async clients(filters: Filters, user: RequestUser, ip?: string, ua?: string) {
    const rows = await this.prisma.client.findMany({
      where: {
        status: filters.status as ClientStatus | undefined,
        locationId: filters.locationId,
        createdAt: this.range(filters),
      },
      include: {
        location: true,
        transactions: {
          where: { status: TransactionStatus.RECORDED },
          select: { transactionDate: true, quantityKg: true, inputUnit: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    const data = rows.map((row) => ({
      code: row.clientCode,
      name: row.name,
      location: row.location?.name ?? '',
      status: row.status,
      frequency: classifyFrequency(
        row.transactions.map((item) => item.transactionDate),
      ),
      totalKg: this.weight(row.transactions),
    }));
    return this.deliver('Client report', data, filters, user, ip, ua);
  }

  async suppliers(
    filters: Filters,
    user: RequestUser,
    ip?: string,
    ua?: string,
  ) {
    const rows = await this.prisma.supplier.findMany({
      where: {
        status: filters.status as EntityStatus | undefined,
        locationId: filters.locationId,
      },
      include: {
        location: true,
        transactions: {
          where: { status: TransactionStatus.RECORDED },
          select: { transactionDate: true, quantityKg: true, inputUnit: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    const data = rows.map((row) => ({
      code: row.supplierCode,
      name: row.name,
      location: row.location?.name ?? '',
      status: row.status,
      frequency: classifyFrequency(
        row.transactions.map((item) => item.transactionDate),
      ),
      totalKg: this.weight(row.transactions),
    }));
    return this.deliver('Supplier report', data, filters, user, ip, ua);
  }

  async transactions(
    filters: Filters,
    user: RequestUser,
    ip?: string,
    ua?: string,
  ) {
    const rows = await this.prisma.transaction.findMany({
      where: {
        transactionType: filters.transactionType,
        clientId: filters.clientId,
        supplierId: filters.supplierId,
        productId: filters.productId,
        transactionDate: {
          gte: filters.from ? new Date(filters.from) : undefined,
          lte: filters.to ? new Date(filters.to) : undefined,
        },
      },
      include: {
        client: true,
        supplier: true,
        product: true,
        recordedBy: { select: { fullName: true } },
      },
      orderBy: { transactionDate: 'desc' },
    });
    const data = rows.map((row) => ({
      code: row.transactionCode,
      date: row.transactionDate.toISOString().slice(0, 10),
      type: row.transactionType,
      party: row.client?.name ?? row.supplier?.name ?? '',
      product: row.product.name,
      quantityKg: row.quantityKg ? Number(row.quantityKg) : null,
      unit: row.inputUnit,
      inputQuantity: Number(row.inputQuantity),
      status: row.status,
      recordedBy: row.recordedBy.fullName,
    }));
    const purchased = data
      .filter((row) => row.type === 'CLIENT_PURCHASE')
      .reduce((sum, row) => sum + (row.quantityKg ?? 0), 0);
    const supplied = data
      .filter((row) => row.type === 'SUPPLIER_SUPPLY')
      .reduce((sum, row) => sum + (row.quantityKg ?? 0), 0);
    return this.deliver('Transaction report', data, filters, user, ip, ua, {
      purchasedKg: purchased,
      suppliedKg: supplied,
      count: data.length,
    });
  }

  async quantities(
    filters: Filters,
    user: RequestUser,
    ip?: string,
    ua?: string,
  ) {
    if (!user.permissions.includes('reports.management'))
      throw new ForbiddenException(
        'You do not have permission to view this report.',
      );
    const report = await this.transactions(filters, user, ip, ua);
    return report;
  }

  async purchasing(
    filters: Filters,
    user: RequestUser,
    ip?: string,
    ua?: string,
  ) {
    if (!user.permissions.includes('reports.management'))
      throw new ForbiddenException(
        'You do not have permission to view purchasing patterns.',
      );
    const clients = await this.prisma.client.findMany({
      include: {
        transactions: {
          where: {
            status: TransactionStatus.RECORDED,
            transactionType: TransactionType.CLIENT_PURCHASE,
            transactionDate: {
              gte: filters.from ? new Date(filters.from) : undefined,
              lte: filters.to ? new Date(filters.to) : undefined,
            },
          },
          select: { transactionDate: true },
        },
      },
    });
    const counts = {
      MULTIPLE_PER_WEEK: 0,
      WEEKLY: 0,
      BIWEEKLY: 0,
      MONTHLY: 0,
      IRREGULAR: 0,
      INSUFFICIENT_DATA: 0,
    };
    for (const client of clients)
      counts[
        classifyFrequency(
          client.transactions.map((item) => item.transactionDate),
        )
      ] += 1;
    const data = Object.entries(counts).map(([frequency, clientsCount]) => ({
      frequency,
      clients: clientsCount,
    }));
    return this.deliver(
      'Purchasing frequency report',
      data,
      filters,
      user,
      ip,
      ua,
    );
  }

  private range(filters: Filters): Prisma.DateTimeFilter | undefined {
    if (!filters.from && !filters.to) return undefined;
    return {
      gte: filters.from ? new Date(filters.from) : undefined,
      lte: filters.to ? new Date(filters.to) : undefined,
    };
  }

  private weight(
    rows: { quantityKg: Prisma.Decimal | null; inputUnit: ProductUnit }[],
  ) {
    return rows
      .filter(
        (row) =>
          row.inputUnit === ProductUnit.KG ||
          row.inputUnit === ProductUnit.TONNE,
      )
      .reduce((sum, row) => sum + Number(row.quantityKg ?? 0), 0);
  }

  private async deliver(
    title: string,
    data: Record<string, unknown>[],
    filters: Filters,
    user: RequestUser,
    ip?: string,
    ua?: string,
    totals?: Record<string, number>,
  ) {
    const generatedAt = new Date().toISOString();
    if (!filters.format)
      return { title, generatedAt, filters, totals, rows: data };
    if (!user.permissions.includes('reports.export'))
      throw new ForbiddenException(
        'You do not have permission to export reports.',
      );
    await this.audit.record({
      userId: user.id,
      action: 'REPORT_EXPORT',
      entity: 'Report',
      details: `${title} exported as ${filters.format}.`,
      newValue: { filters },
      ipAddress: ip,
      userAgent: ua,
    });
    const file = await this.exportFile(
      title,
      data,
      filters,
      user.fullName,
      totals,
    );
    return { title, generatedAt, file };
  }

  private async exportFile(
    title: string,
    data: Record<string, unknown>[],
    filters: Filters,
    generatedBy: string,
    totals?: Record<string, number>,
  ) {
    const headers = data[0] ? Object.keys(data[0]) : ['info'];
    const rows = data.length
      ? data
      : [{ info: 'No records matched the filters.' }];
    if (filters.format === 'csv') {
      const lines = [
        headers.join(','),
        ...rows.map((row) =>
          headers.map((key) => JSON.stringify(row[key] ?? '')).join(','),
        ),
      ];
      return {
        filename: `${title.replace(/\s+/g, '-').toLowerCase()}.csv`,
        contentType: 'text/csv',
        base64: Buffer.from(lines.join('\n')).toString('base64'),
      };
    }
    if (filters.format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(title.slice(0, 31));
      sheet.addRow([title]);
      sheet.addRow([`Generated ${new Date().toISOString()} by ${generatedBy}`]);
      sheet.addRow([`Filters ${JSON.stringify(filters)}`]);
      sheet.addRow([]);
      sheet.addRow(headers);
      rows.forEach((row) => sheet.addRow(headers.map((key) => row[key] ?? '')));
      if (totals) sheet.addRow([]);
      if (totals)
        Object.entries(totals).forEach(([key, value]) =>
          sheet.addRow([key, value]),
        );
      const buffer = await workbook.xlsx.writeBuffer();
      return {
        filename: `${title.replace(/\s+/g, '-').toLowerCase()}.xlsx`,
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        base64: Buffer.from(buffer).toString('base64'),
      };
    }
    const doc = new PDFDocument({ margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const done = new Promise<Buffer>((resolve) =>
      doc.on('end', () => resolve(Buffer.concat(chunks))),
    );
    doc.fontSize(16).text(title);
    doc
      .fontSize(10)
      .text(`Generated ${new Date().toISOString()} by ${generatedBy}`);
    doc.text(`Filters ${JSON.stringify(filters)}`);
    doc.moveDown();
    rows
      .slice(0, 200)
      .forEach((row) =>
        doc.text(headers.map((key) => `${key}: ${cell(row[key])}`).join(' | ')),
      );
    if (totals) doc.moveDown().text(`Totals ${JSON.stringify(totals)}`);
    doc.end();
    const buffer = await done;
    return {
      filename: `${title.replace(/\s+/g, '-').toLowerCase()}.pdf`,
      contentType: 'application/pdf',
      base64: buffer.toString('base64'),
    };
  }
}

function cell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value);
  }
  return JSON.stringify(value);
}
