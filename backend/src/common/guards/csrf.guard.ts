/** CSRF double-submit: cookie csrf + header x-csrf-token on unsafe methods. */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AppRequest } from '../decorators';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AppRequest>();
    if (SAFE.has(request.method)) return true;
    const cookie = request.cookies?.csrf_token as string | undefined;
    const header = request.header('x-csrf-token');
    if (cookie && header && cookie === header) return true;
    throw new ForbiddenException(
      'The security token did not match. Refresh the page and try again.',
    );
  }
}
