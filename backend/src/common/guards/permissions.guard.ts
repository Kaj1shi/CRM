/** Enforces @RequirePermissions(...) against the signed-in role map. */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppRequest, PERMISSIONS_KEY } from '../decorators';
import { PermissionKey } from '../permissions';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PermissionKey[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;
    const request = context.switchToHttp().getRequest<AppRequest>();
    const granted = new Set(request.user?.permissions ?? []);
    if (required.every((permission) => granted.has(permission))) return true;
    throw new ForbiddenException(
      'You do not have permission to perform this action.',
    );
  }
}
