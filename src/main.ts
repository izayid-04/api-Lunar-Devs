import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const frontUrl = process.env.FRONT_URL;
  if (frontUrl) {
    app.enableCors({ origin: frontUrl.split(',').map((url) => url.trim()) });
  } else {
    console.warn(
      'FRONT_URL is not set: allowing all CORS origins (dev fallback only).',
    );
    app.enableCors({ origin: true });
  }

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
  } catch (err) {
    console.error(
      'Database connection failed at startup — the app will keep running without it:',
      err instanceof Error ? err.message : err,
    );
  }

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
