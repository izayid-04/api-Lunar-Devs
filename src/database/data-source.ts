import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { HealthCheck } from './entities/health-check.entity.js';
import { User } from '../users/entities/user.entity.js';
import { CitizenMessage } from '../messages/entities/citizen-message.entity.js';
import { MunicipalService } from '../services/entities/municipal-service.entity.js';
import { Announcement } from '../announcements/entities/announcement.entity.js';
import { Alert } from '../alerts/entities/alert.entity.js';
import { Notification } from '../notifications/entities/notification.entity.js';
import { LoginAttempt } from '../auth/entities/login-attempt.entity.js';
import { AppointmentSlot } from '../appointments/entities/appointment-slot.entity.js';
import { Appointment } from '../appointments/entities/appointment.entity.js';
import { MessageStatusHistory } from '../messages/entities/message-status-history.entity.js';

const currentDir = dirname(fileURLToPath(import.meta.url));

// Single source of truth for the MySQL connection, shared by:
// - the TypeORM CLI (migration:generate/run/revert), run against src/*.ts via ts-node
// - the Nest app (src/app.module.ts), run against the compiled dist/*.js
// The `{.ts,.js}` glob matches whichever of the two is actually present
// next to this file at runtime.
export const dataSourceOptions: DataSourceOptions = {
  type: 'mysql',
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  timezone: 'Z',
  entities: [
    HealthCheck,
    User,
    CitizenMessage,
    MessageStatusHistory,
    MunicipalService,
    Announcement,
    Alert,
    Notification,
    LoginAttempt,
    AppointmentSlot,
    Appointment,
  ],
  migrations: [join(currentDir, 'migrations', '*{.ts,.js}')],
  synchronize: false,
  migrationsRun: true,
};

export default new DataSource(dataSourceOptions);
