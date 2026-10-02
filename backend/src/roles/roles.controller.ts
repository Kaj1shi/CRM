import { Controller, Get } from '@nestjs/common';
import { Permissions } from '../common/decorators';
import { PERMISSIONS } from '../common/permissions';
import { PrismaService } from '../prisma/prisma.service';

@Controller('roles')
export class RolesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Permissions(PERMISSIONS.ROLES_ASSIGN)
  async list() {
    const roles = await this.prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: { permissions: { include: { permission: true } } },
    });
    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions.map((item) => item.permission.key),
    }));
  }
}
