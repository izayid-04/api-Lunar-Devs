// Loaded first and explicitly (not just transitively via
// database/data-source.ts) so .env is guaranteed populated before
// anything else in the import graph reads process.env — only matters
// for local dev; Hodifly injects real env vars directly, no .env file.
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module.js';
import {
  seedAlerts,
  seedAnnouncements,
  seedAppointmentSlots,
  seedDemoCitizen,
  seedDemoUsers,
  seedMunicipalServices,
} from './database/seed.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Trust proxy for Passenger / Apache reverse proxy, to get accurate client IP in req.ip
  const expressApp = app.getHttpAdapter().getInstance();
  if (expressApp && typeof expressApp.set === 'function') {
    expressApp.set('trust proxy', 1);
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Any http://localhost:<port> is always allowed, regardless of
  // FRONT_URL, so a local front dev server works on whatever port it
  // happens to run on without touching env vars.
  const LOCALHOST_ORIGIN = /^http:\/\/localhost:\d+$/;

  // Real-world origins (prod front, a Vercel preview URL later, etc.) go
  // in FRONT_URL as a comma-separated list — add one there, no code
  // change needed.
  const frontUrl = process.env.FRONT_URL;
  const configuredOrigins = frontUrl
    ? frontUrl
        .split(',')
        .map((url) => url.trim())
        .filter(Boolean)
    : [];

  if (configuredOrigins.length === 0) {
    console.warn(
      'FRONT_URL is not set: allowing all CORS origins (dev fallback only, plus localhost is always allowed).',
    );
  }

  app.enableCors({
    origin(
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) {
      // No Origin header = not a browser request (curl, server-to-server).
      if (
        !origin ||
        configuredOrigins.length === 0 ||
        configuredOrigins.includes(origin) ||
        LOCALHOST_ORIGIN.test(origin)
      ) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`), false);
    },
  });

  // Connect manually (manualInitialization: true in app.module.ts) so a
  // database outage logs an error instead of crashing the whole process —
  // GET /health must keep responding even if MySQL is unreachable.
  // migrationsRun: true on the data source means this also applies any
  // pending migrations, which is how migrations run in production since
  // there is no SSH access to invoke the TypeORM CLI there.
  const dataSource = app.get(DataSource);
  try {
    await dataSource.initialize();
    console.log('Database connected and migrations applied.');

    try {
      // Order matters: demo users first, so seedAnnouncements has an
      // admin account to attribute seeded announcements to.
      await seedDemoUsers(dataSource);
      await seedDemoCitizen(dataSource);
      await seedMunicipalServices(dataSource);
      await seedAnnouncements(dataSource);
      await seedAlerts(dataSource);
      await seedAppointmentSlots(dataSource);
    } catch (seedErr) {
      console.error(
        'Seeding failed:',
        seedErr instanceof Error ? seedErr.message : seedErr,
      );
    }
  } catch (err) {
    console.error(
      'Database connection failed at startup — the app will keep running without it:',
      err instanceof Error ? err.message : err,
    );
  }

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
