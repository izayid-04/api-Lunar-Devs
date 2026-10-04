import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request, Response } from 'express';

interface CacheEntry {
  data: any;
  cachedAt: number;
}

const memoryCache = new Map<string, CacheEntry>();
const DEFAULT_TTL_MS = 60 * 1000; // 60 secondes (F77)

@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    // Ne cacher que les requêtes GET sans header Authorization (lectures publiques)
    if (req.method !== 'GET' || req.headers.authorization) {
      return next.handle();
    }

    const key = `${req.baseUrl || ''}${req.path}?${new URLSearchParams(req.query as Record<string, string>).toString()}`;
    const now = Date.now();
    const cached = memoryCache.get(key);

    if (cached && now - cached.cachedAt < DEFAULT_TTL_MS) {
      const ageSeconds = Math.round((now - cached.cachedAt) / 1000);
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Cache-Age', `${ageSeconds}s`);
      return of(cached.data);
    }

    return next.handle().pipe(
      tap((data) => {
        // Enregistrer la réponse en cache
        memoryCache.set(key, {
          data,
          cachedAt: Date.now(),
        });
        res.setHeader('X-Cache', 'MISS');
      }),
    );
  }
}
