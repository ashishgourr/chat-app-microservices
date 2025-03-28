import { ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';
import { CacheModuleOptions } from '@nestjs/cache-manager';

export const redisConfig = (
  configService: ConfigService,
): CacheModuleOptions => ({
  store: redisStore,
  host: configService.get('REDIS_HOST', 'localhost'),
  port: configService.get<number>('REDIS_PORT', 6379),
  ttl: configService.get('REDIS_TTL', 3600),
  auth_pass: configService.get('REDIS_PASSWORD'),
});
