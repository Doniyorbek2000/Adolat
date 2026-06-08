import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

export interface ErrorResponseBody {
  success: false;
  statusCode: number;
  message: string;
  error: string;
  path: string;
  timestamp: string;
}

/**
 * Barcha xatolarni (HttpException va kutilmagan xatolarni) yagona formatga keltiradi:
 * { success: false, statusCode, message, error, path, timestamp }
 *
 * 5xx xatolar stack-trace bilan log qilinadi, 4xx xatolar esa jim o'tkaziladi
 * (foydalanuvchi xatolari bilan loglarni to'ldirmaslik uchun).
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = isHttpException ? exception.getResponse() : null;

    const { message, error } = this.extractMessageAndError(exception, statusCode, exceptionResponse);

    const body: ErrorResponseBody = {
      success: false,
      statusCode,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${statusCode}: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(statusCode).json(body);
  }

  private extractMessageAndError(
    exception: unknown,
    statusCode: number,
    exceptionResponse: string | object | null,
  ): { message: string; error: string } {
    if (exceptionResponse && typeof exceptionResponse === 'object') {
      const body = exceptionResponse as { message?: string | string[]; error?: string };
      const message = Array.isArray(body.message) ? body.message.join('; ') : body.message;
      return {
        message: message ?? (exception instanceof Error ? exception.message : 'Xatolik yuz berdi'),
        error: body.error ?? HttpStatus[statusCode] ?? 'Error',
      };
    }

    if (typeof exceptionResponse === 'string') {
      return { message: exceptionResponse, error: HttpStatus[statusCode] ?? 'Error' };
    }

    return {
      message: "Kutilmagan xatolik yuz berdi. Iltimos keyinroq qayta urinib ko'ring.",
      error: 'Internal Server Error',
    };
  }
}
