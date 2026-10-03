import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    if (isHttp) {
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        response.status(status).json(res);
      } else {
        response.status(status).json({
          statusCode: status,
          message: res,
        });
      }
      return;
    }

    // Erreur interne (500) non prévue
    this.logger.error(
      `Unhandled error on ${request.method} ${request.url}:`,
      exception instanceof Error ? exception.stack : exception,
    );

    // En production et en test : aucune trace technique renvoyée au client
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Une erreur interne est survenue. Veuillez réessayer ultérieurement.',
    });
  }
}
