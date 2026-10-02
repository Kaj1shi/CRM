import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { AuditService } from '../common/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { LocationDto } from './locations.dto';

@Injectable()
export class LocationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list() {
    return this.prisma.location.findMany({ orderBy: { name: 'asc' } });
  }

  async create(
    dto: LocationDto,
    actorId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const location = await this.prisma.location.create({ data: dto });
    await this.audit.record({
      userId: actorId,
      action: AuditAction.CREATE,
      entity: 'Location',
      entityId: location.id,
      details: 'Location created.',
      newValue: location,
      ipAddress,
      userAgent,
    });
    return location;
  }

  async update(
    id: string,
    dto: LocationDto,
    actorId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const current = await this.prisma.location.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Location was not found.');
    const location = await this.prisma.location.update({
      where: { id },
      data: dto,
    });
    await this.audit.record({
      userId: actorId,
      action: AuditAction.UPDATE,
      entity: 'Location',
      entityId: id,
      details: 'Location updated.',
      oldValue: current,
      newValue: location,
      ipAddress,
      userAgent,
    });
    return location;
  }
}
