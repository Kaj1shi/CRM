import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityStatus, Prisma, ProductCategory } from '@prisma/client';
import { AuditService } from '../common/audit.service';
import { CodesService } from '../common/codes.service';
import { pageMeta } from '../common/dto/page-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ProductDto, ProductQueryDto } from './products.dto';

const SEQUENCE: Record<ProductCategory, string> = {
  FINISHED_PRODUCT: 'product_finished',
  RAW_MATERIAL: 'product_raw',
  OTHER: 'product_other',
};

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codes: CodesService,
    private readonly audit: AuditService,
  ) {}

  async list(query: ProductQueryDto) {
    const search = query.search?.trim();
    const where: Prisma.ProductWhereInput = {
      status: query.status,
      category: query.category,
      OR: search
        ? [
            { productCode: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ]
        : undefined,
    };
    const allowed = new Set([
      'name',
      'productCode',
      'category',
      'status',
      'createdAt',
    ]);
    const orderBy: Prisma.ProductOrderByWithRelationInput =
      query.sortBy && allowed.has(query.sortBy)
        ? { [query.sortBy]: query.sortOrder }
        : { createdAt: 'desc' };
    const [total, data] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return {
      data,
      meta: pageMeta(query.page, query.pageSize, total),
      message: 'Products loaded.',
    };
  }

  async get(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product was not found.');
    return product;
  }

  async create(
    dto: ProductDto,
    actorId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const product = await this.prisma.$transaction(async (tx) => {
      const productCode = await this.codes.nextCode(tx, SEQUENCE[dto.category]);
      return tx.product.create({
        data: {
          productCode,
          name: dto.name.trim(),
          category: dto.category,
          description: dto.description,
          unit: dto.unit ?? 'KG',
          status: dto.status,
        },
      });
    });
    await this.audit.record({
      userId: actorId,
      action: 'CREATE',
      entity: 'Product',
      entityId: product.id,
      details: 'Product created.',
      newValue: { productCode: product.productCode, name: product.name },
      ipAddress,
      userAgent,
    });
    return product;
  }

  async update(
    id: string,
    dto: ProductDto,
    actorId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const current = await this.get(id);
    const product = await this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name.trim(),
        category: dto.category,
        description: dto.description,
        unit: dto.unit,
        status: dto.status,
      },
    });
    await this.audit.record({
      userId: actorId,
      action: 'UPDATE',
      entity: 'Product',
      entityId: id,
      details: 'Product updated.',
      oldValue: { name: current.name, status: current.status },
      newValue: { name: product.name, status: product.status },
      ipAddress,
      userAgent,
    });
    return product;
  }

  async setStatus(
    id: string,
    status: EntityStatus,
    actorId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const current = await this.get(id);
    const product = await this.prisma.product.update({
      where: { id },
      data: { status },
    });
    await this.audit.record({
      userId: actorId,
      action: status === EntityStatus.ACTIVE ? 'REACTIVATE' : 'DEACTIVATE',
      entity: 'Product',
      entityId: id,
      details: `Product status set to ${status}.`,
      oldValue: { status: current.status },
      newValue: { status },
      ipAddress,
      userAgent,
    });
    return product;
  }
}
