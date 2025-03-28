import { Global, Module } from '@nestjs/common';
import { CachingController } from './caching.controller';
import { CachingService } from './caching.service';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisConfig } from './config/redis.config';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => redisConfig(configService),
      isGlobal: true,
    }),
  ],
  controllers: [CachingController],
  providers: [CachingService],
  exports: [CachingService],
})
export class CachingModule {}
