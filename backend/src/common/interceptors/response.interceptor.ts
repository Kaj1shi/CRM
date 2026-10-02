/** Wraps successful handler results as { success: true, data } unless already shaped. */
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

type Envelope = {
  data: unknown;
  message?: string;
  warnings?: string[];
  meta?: unknown;
};

function isEnvelope(value: unknown): value is Envelope {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    'message' in value
  );
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      map((value: unknown) => {
        if (isEnvelope(value)) {
          return { success: true, ...value };
        }
        return { success: true, data: value };
      }),
    );
  }
}
