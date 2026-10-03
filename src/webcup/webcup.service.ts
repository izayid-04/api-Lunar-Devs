import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

const DEFAULT_WEBCUP_API_URL =
  'https://24h.webcup.fr/wp-json/webcup/v1/requests';
const CACHE_TTL_MS = 60_000;
const FETCH_TIMEOUT_MS = 8_000;

interface CacheEntry {
  data: unknown;
  fetchedAt: number;
}

export interface WebcupRequestsResult {
  // Passed through as-is from the upstream Webcup API — this backend
  // does not know/reshape its exact schema (session info, requests
  // list, etc. are whatever Webcup's API returns).
  data: unknown;
  cache: { hit: boolean; ageSeconds: number };
}

@Injectable()
export class WebcupService {
  private readonly logger = new Logger(WebcupService.name);
  private cache: CacheEntry | null = null;

  async getRequests(): Promise<WebcupRequestsResult> {
    const now = Date.now();

    if (this.cache && now - this.cache.fetchedAt < CACHE_TTL_MS) {
      return this.toResult(this.cache, true, now);
    }

    try {
      const data = await this.fetchFromWebcup();
      this.cache = { data, fetchedAt: now };
      return this.toResult(this.cache, false, now);
    } catch (err) {
      // Never log the raw error object as-is if it could embed request
      // details — just its message. The API key only ever lives in a
      // request header we build ourselves, never in a URL or in this
      // message.
      this.logger.error(
        `Webcup API call failed: ${err instanceof Error ? err.message : String(err)}`,
      );

      if (this.cache) {
        // Serve the last known-good response rather than fail outright.
        return this.toResult(this.cache, true, now);
      }
      throw new ServiceUnavailableException('Webcup API unavailable');
    }
  }

  private toResult(
    entry: CacheEntry,
    hit: boolean,
    now: number,
  ): WebcupRequestsResult {
    return {
      data: entry.data,
      cache: { hit, ageSeconds: Math.round((now - entry.fetchedAt) / 1000) },
    };
  }

  private async fetchFromWebcup(): Promise<unknown> {
    const apiKey = process.env.WEBCUP_API_KEY;
    if (!apiKey) {
      throw new Error('WEBCUP_API_KEY is not set');
    }
    const url = process.env.WEBCUP_API_URL ?? DEFAULT_WEBCUP_API_URL;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        headers: { 'X-Webcup-Api-Key': apiKey },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Webcup API responded with status ${response.status}`);
      }
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }
}
