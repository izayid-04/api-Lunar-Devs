import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
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
import { AlertsModule } from './alerts/alerts.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { AppointmentsModule } from './appointments/appointments.module.js';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100, // standard baseline
      },
    ]),
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
    AlertsModule,
    NotificationsModule,
    AppointmentsModule,
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
