import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HealthCheck } from './database/entities/health-check.entity.js';

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  check() {
    return {
      status: 'ok',
      date: new Date().toISOString(),
      nodeVersion: process.version,
      appName: process.env.APP_NAME ?? null,
    };
  }

  @Get('db')
  async checkDb() {
    if (!this.dataSource.isInitialized) {
      throw new ServiceUnavailableException({
        status: 'error',
        message: 'Database unavailable',
      });
    }

    try {
      const repository = this.dataSource.getRepository(HealthCheck);
      await repository.insert({});
      const [totalRows, last] = await Promise.all([
        repository.count(),
        repository.findOne({ where: {}, order: { createdAt: 'DESC' } }),
      ]);

      return {
        status: 'ok',
        totalRows,
        lastCreatedAt: last?.createdAt ?? null,
      };
    } catch (err) {
      console.error(
        'GET /health/db query failed:',
        err instanceof Error ? err.message : err,
      );
      throw new ServiceUnavailableException({
        status: 'error',
        message: 'Database query failed',
      });
    }
  }
}
