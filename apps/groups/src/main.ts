import { NestFactory } from '@nestjs/core';
import { GroupsModule } from './groups.module';

async function bootstrap() {
  const app = await NestFactory.create(GroupsModule);
  await app.listen(process.env.port ?? 3002);
}
void bootstrap();
