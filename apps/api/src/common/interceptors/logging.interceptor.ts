import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { IncomingMessage } from 'http';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (request as any).user?.id ?? (request as any).userId;
    const start = Date.now();
    const meta = userId ? ` (userId=${userId})` : '';

    // Log the request as soon as it arrives so hangs/errors are never invisible.
    this.logger.log(`>>> ${request.method} ${request.url}${meta}`);

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          const status = context.switchToHttp().getResponse().statusCode;
          this.logger.log(`<<< ${request.method} ${request.url} → ${status} (${duration}ms)`);
        },
        error: () => {
          const duration = Date.now() - start;
          this.logger.error(`!!! ${request.method} ${request.url} → ERROR (${duration}ms)`);
        },
      }),
    );
  }
}
