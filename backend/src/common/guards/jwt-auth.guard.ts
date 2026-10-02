/** JWT access-token guard; skips routes marked @Public(). */
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AppRequest, IS_PUBLIC_KEY, RequestUser } from '../decorators';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AppRequest>();
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) {
      throw new UnauthorizedException(
        'Your session has expired. Please sign in again.',
      );
    }

    let payload: { sub?: string };
    try {
      payload = await this.jwt.verifyAsync<{ sub: string }>(token);
    } catch {
      throw new UnauthorizedException(
        'Your session has expired. Please sign in again.',
      );
    }
    if (!payload.sub) {
      throw new UnauthorizedException(
        'Your session has expired. Please sign in again.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('This account cannot sign in.');
    }

    const requestUser: RequestUser = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role.name,
      permissions: user.role.permissions.map((item) => item.permission.key),
      mustChangePassword: user.mustChangePassword,
    };
    request.user = requestUser;
    return true;
  }
}
