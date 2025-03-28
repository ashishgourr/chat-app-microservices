import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cache } from 'cache-manager';
@Injectable()
export class CachingService {
  private readonly logger = new Logger(CachingService.name);
  private readonly DEFAULT_TTL = 3600; // 1 hour

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  //SET A VALUE IN REDIS
  async set<T>(
    key: string,
    value: T,
    ttl: number = this.DEFAULT_TTL,
  ): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
      this.logger.log(`Set key "${key}" in Redis with TTL ${ttl}s`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to set key "${key}" in Redis: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }

  // GET A VALUE FROM REDIS
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.cacheManager.get<T>(key);
      this.logger.log(`Fetched key "${key}" from Redis`);

      if (value === undefined || value === null) return null;

      // Auto-detect and parse stringified JSON
      return typeof value === 'string'
        ? (JSON.parse(value) as T)
        : (value as T);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to fetch key "${key}" from Redis: ${errorMessage}`,
      );
      throw new Error(errorMessage);
    }
  }

  // DELETE A VALUE FROM REDIS
  async delete(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.log(`Deleted key "${key}" from Redis`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to delete key "${key}" from Redis: ${errorMessage}`,
      );
      throw new Error(errorMessage);
    }
  }

  // CLEAR ALL DATA FROM REDIS

  async reset(): Promise<void> {
    try {
      await this.cacheManager.clear();
      this.logger.log('Cleared all Redis cache');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to clear Redis cache: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
}
