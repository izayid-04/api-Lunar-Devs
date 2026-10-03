import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnnouncementsModule } from './announcements/announcements.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { dataSourceOptions } from './database/data-source.js';
import { HealthController } from './health.controller.js';
import { MessagesModule } from './messages/messages.module.js';
import { AdminPingController, AgentPingController } from './role-demo.controller.js';
import { ServicesModule } from './services/services.module.js';
import { UsersModule } from './users/users.module.js';
import { WebcupModule } from './webcup/webcup.module.js';

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
    UsersModule,
    AuthModule,
    MessagesModule,
    WebcupModule,
    DashboardModule,
    ServicesModule,
    AnnouncementsModule,
  ],
  controllers: [
    AppController,
    HealthController,
    AgentPingController,
    AdminPingController,
  ],
  providers: [AppService],
})
export class AppModule {}
