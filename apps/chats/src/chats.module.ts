import { Module } from '@nestjs/common';
import { ChatsController } from './chats.controller';
import { ChatsService } from './chats.service';
import { RedisService } from './services/redis.service';
import { MessagesModule } from 'apps/messages/src/messages.module';
import { CachingModule } from 'apps/caching/src/caching.module';

@Module({
  imports: [MessagesModule, CachingModule],
  controllers: [ChatsController],
  providers: [ChatsService, RedisService],
})
export class ChatsModule {}
