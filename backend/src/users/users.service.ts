import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, Prisma, UserRole, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { AuditService } from '../common/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './users.dto';

const publicSelect = {
  id: true,
  fullName: true,
  email: true,
  status: true,
  lastLoginAt: true,
  emailVerified: true,
  mustChangePassword: true,
  createdAt: true,
  updatedAt: true,
  role: { select: { name: true } },
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list() {
    const users = await this.prisma.user.findMany({
      select: publicSelect,
      orderBy: { fullName: 'asc' },
    });
    return users.map((user) => ({ ...user, role: user.role.name }));
  }

  async create(
    dto: CreateUserDto,
    actorId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    this.assertPassword(dto.password);
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing)
      throw new ConflictException('A user with that email already exists.');
    const role = await this.prisma.role.findUniqueOrThrow({
      where: { name: dto.role },
    });
    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName.trim(),
        email: dto.email.toLowerCase(),
        passwordHash: await argon2.hash(dto.password),
        roleId: role.id,
        mustChangePassword: true,
      },
      select: publicSelect,
    });
    await this.audit.record({
      userId: actorId,
      action: AuditAction.CREATE,
      entity: 'User',
      entityId: user.id,
      details: 'User account created.',
      newValue: { fullName: user.fullName, email: user.email, role: dto.role },
      ipAddress,
      userAgent,
    });
    return { ...user, role: user.role.name };
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    actorId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const current = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!current) throw new NotFoundException('User was not found.');
    if (dto.password) this.assertPassword(dto.password);
    const role = dto.role
      ? await this.prisma.role.findUniqueOrThrow({ where: { name: dto.role } })
      : null;
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        fullName: dto.fullName?.trim(),
        email: dto.email?.toLowerCase(),
        roleId: role?.id,
        passwordHash: dto.password
          ? await argon2.hash(dto.password)
          : undefined,
        mustChangePassword: dto.password ? true : undefined,
      },
      select: publicSelect,
    });
    if (dto.role && dto.role !== current.role.name) {
      await this.audit.record({
        userId: actorId,
        action: AuditAction.ROLE_CHANGE,
        entity: 'User',
        entityId: id,
        details: 'User role changed.',
        oldValue: { role: current.role.name },
        newValue: { role: dto.role },
        ipAddress,
        userAgent,
      });
    }
    if (dto.password) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.audit.record({
        userId: actorId,
        action: AuditAction.PASSWORD_CHANGE,
        entity: 'User',
        entityId: id,
        details: 'Password was reset by an administrator.',
        ipAddress,
        userAgent,
      });
    }
    if (dto.fullName || dto.email) {
      await this.audit.record({
        userId: actorId,
        action: AuditAction.UPDATE,
        entity: 'User',
        entityId: id,
        details: 'User profile updated.',
        oldValue: { fullName: current.fullName, email: current.email },
        newValue: { fullName: user.fullName, email: user.email },
        ipAddress,
        userAgent,
      });
    }
    return { ...user, role: user.role.name };
  }

  async setStatus(
    id: string,
    status: UserStatus,
    actorId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const current = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!current) throw new NotFoundException('User was not found.');
    if (
      current.role.name === UserRole.ADMIN &&
      status === UserStatus.INACTIVE
    ) {
      const activeAdmins = await this.prisma.user.count({
        where: {
          status: UserStatus.ACTIVE,
          role: { name: UserRole.ADMIN },
          id: { not: id },
        },
      });
      if (activeAdmins === 0) {
        throw new BadRequestException(
          'The last active administrator cannot be deactivated.',
        );
      }
    }
    const user = await this.prisma.user.update({
      where: { id },
      data: { status },
      select: publicSelect,
    });
    if (status === UserStatus.INACTIVE) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    await this.audit.record({
      userId: actorId,
      action:
        status === UserStatus.ACTIVE
          ? AuditAction.REACTIVATE
          : AuditAction.DEACTIVATE,
      entity: 'User',
      entityId: id,
      details:
        status === UserStatus.ACTIVE
          ? 'User reactivated.'
          : 'User deactivated.',
      oldValue: { status: current.status },
      newValue: { status },
      ipAddress,
      userAgent,
    });
    return { ...user, role: user.role.name };
  }

  private assertPassword(password: string) {
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      throw new BadRequestException({
        message: 'Please check the highlighted fields.',
        errors: { password: 'Password must include a letter and a number.' },
      });
    }
  }
}
