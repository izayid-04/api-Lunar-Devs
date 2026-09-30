import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      date: new Date().toISOString(),
      nodeVersion: process.version,
      appName: process.env.APP_NAME ?? null,
    };
  }
}
