import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { HealthController } from './health.controller.js';
import { dataSourceOptions } from './database/data-source.js';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...dataSourceOptions,
      // The connection is established manually in main.ts, wrapped in a
      // try/catch, so a database outage never prevents the app itself
      // from starting (see GET /health, which must keep working either
      // way — GET /health/db reports the actual DB status).
      manualInitialization: true,
    }),
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
