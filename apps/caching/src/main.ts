import { NestFactory } from '@nestjs/core';
import { CachingModule } from './caching.module';

async function bootstrap() {
  const app = await NestFactory.create(CachingModule);
  await app.listen(process.env.port ?? 3004);
}
void bootstrap();
