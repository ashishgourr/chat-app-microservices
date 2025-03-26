import { Module } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { MongooseModule } from '@nestjs/mongoose';

import { Message, MessageSchema } from './schemas/message.schema';
import { TerminusModule } from '@nestjs/terminus';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost:27017/chatdb', {
      retryAttempts: 5,
      retryDelay: 1000,
    }),
    TerminusModule,
    MongooseModule.forFeature([
      {
        name: Message.name,
        schema: MessageSchema,
      },
    ]),
  ],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
