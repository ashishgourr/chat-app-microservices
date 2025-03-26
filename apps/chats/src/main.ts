import { NestFactory } from '@nestjs/core';
import { ChatsModule } from './chats.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    ChatsModule,
    {
      transport: Transport.GRPC,
      options: {
        url: '0.0.0.0:5000',
        package: 'chat',
        protoPath: './apps/chats/src/protos/chat.proto',
      },
    },
  );

  console.log('Chat Service running on port 5000');

  await app.listen();
}
void bootstrap();
