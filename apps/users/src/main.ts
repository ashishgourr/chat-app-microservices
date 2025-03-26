import { NestFactory } from '@nestjs/core';
import { UsersModule } from './users.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(UsersModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
    }),
  );

  await app.listen(process.env.port ?? 3000);
}
void bootstrap();
