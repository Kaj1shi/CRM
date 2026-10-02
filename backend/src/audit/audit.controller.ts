import { Controller, Get, Query } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Permissions } from '../common/decorators';
import { PageQueryDto, pageMeta } from '../common/dto/page-query.dto';
import { PERMISSIONS } from '../common/permissions';
import { PrismaService } from '../prisma/prisma.service';

class AuditQueryDto extends PageQueryDto {
  @IsOptional() @IsEnum(AuditAction) action?: AuditAction;
  @IsOptional() @IsString() entity?: string;
}
@Controller('audit-logs')
@Permissions(PERMISSIONS.AUDIT_VIEW)
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}
  @Get()
  async list(@Query() query: AuditQueryDto) {
    const where = { action: query.action, entity: query.entity };
    const [total, data] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { fullName: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return {
      data,
      meta: pageMeta(query.page, query.pageSize, total),
      message: 'Audit logs loaded.',
    };
  }
}
