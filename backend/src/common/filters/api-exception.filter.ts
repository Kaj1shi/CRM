/** Maps exceptions to { success: false, message, errors? } for the SPA. */
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

type ErrorBody = {
  message?: string | string[];
  errors?: Record<string, string>;
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const isProduction = process.env.NODE_ENV === 'production';

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      const body =
        typeof raw === 'string' ? { message: raw } : (raw as ErrorBody);
      const message = Array.isArray(body.message)
        ? 'Please check the highlighted fields.'
        : (body.message ?? 'Request could not be completed.');
      const errors = body.errors ?? this.validationErrors(body.message);
      response
        .status(status)
        .json({ success: false, message, ...(errors ? { errors } : {}) });
      return;
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        response.status(HttpStatus.CONFLICT).json({
          success: false,
          message: 'A record with that unique value already exists.',
        });
        return;
      }
      if (exception.code === 'P2003') {
        response.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'The related record could not be found.',
        });
        return;
      }
      if (exception.code === 'P2025') {
        response.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: 'The requested record was not found.',
        });
        return;
      }
    }

    this.logger.error(
      exception instanceof Error ? exception.message : 'Unhandled error',
    );
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: isProduction
        ? 'The request could not be completed.'
        : exception instanceof Error
          ? exception.message
          : 'The request could not be completed.',
    });
  }

  private validationErrors(
    message: string | string[] | undefined,
  ): Record<string, string> | undefined {
    if (!Array.isArray(message)) return undefined;
    const errors: Record<string, string> = {};
    for (const item of message) {
      const [field] = item.split(' ');
      errors[field] = item;
    }
    return errors;
  }
}
