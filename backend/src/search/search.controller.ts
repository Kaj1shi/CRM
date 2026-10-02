import { Controller, Get, Query } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { Permissions } from '../common/decorators';
import { PERMISSIONS } from '../common/permissions';
import { PrismaService } from '../prisma/prisma.service';
class SearchQueryDto {
  @IsString() @MinLength(2) q!: string;
}
@Controller('search')
@Permissions(PERMISSIONS.DASHBOARD_VIEW)
export class SearchController {
  constructor(private readonly prisma: PrismaService) {}
  @Get()
  async search(@Query() query: SearchQueryDto) {
    const q = query.q.trim();
    const [clients, suppliers, transactions] = await Promise.all([
      this.prisma.client.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { clientCode: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
      }),
      this.prisma.supplier.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { supplierCode: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
      }),
      this.prisma.transaction.findMany({
        where: {
          OR: [
            { transactionCode: { contains: q, mode: 'insensitive' } },
            { referenceNumber: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
        include: { product: true },
      }),
    ]);
    return { clients, suppliers, transactions };
  }
}
