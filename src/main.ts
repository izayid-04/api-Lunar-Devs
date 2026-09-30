import { NestFactory } from '@nestjs/core';
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

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
