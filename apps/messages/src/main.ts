import { NestFactory } from '@nestjs/core';
import { MessagesModule } from './messages.module';

async function bootstrap() {
  const app = await NestFactory.create(MessagesModule);
  await app.listen(process.env.port ?? 3001);
}
void bootstrap();
