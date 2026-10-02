import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { Request } from 'express';
import { PermissionKey } from './permissions';

export const IS_PUBLIC_KEY = 'isPublic';
export const PERMISSIONS_KEY = 'permissions';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const Permissions = (...permissions: PermissionKey[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export type RequestUser = {
  id: string;
  fullName: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'STAFF';
  permissions: string[];
  mustChangePassword: boolean;
};

export type AppRequest = Request & { user?: RequestUser };

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestUser => {
    const request = context.switchToHttp().getRequest<AppRequest>();
    if (!request.user) {
      throw new Error('Authenticated user is missing from the request.');
    }
    return request.user;
  },
);
