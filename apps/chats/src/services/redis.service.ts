import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { Logger } from '@nestjs/common';

@Injectable()
export class RedisService {
  // Redis clients for publishing and subscribing
  private publisher: Redis;
  private subscriber: Redis;

  // Logger instance for logging errors and events
  private readonly logger = new Logger(RedisService.name);

  // Map to store channel-specific callbacks for handling messages
  private readonly callbackMap = new Map<string, (message: string) => void>();

  constructor() {
    // Initialize Redis publisher client for sending messages

    this.publisher = new Redis({
      host: 'localhost',
      port: 6379,
      retryStrategy: (times) => Math.min(times * 50, 2000), // Retry with exponential backoff (max 2 seconds)
    });

    // Initialize Redis subscriber client for receiving messages
    this.subscriber = new Redis({
      host: 'localhost',
      port: 6379,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });

    // Handle Redis connection errors for publisher
    this.publisher.on('error', (err) =>
      this.logger.error('Publisher Redis error:', err),
    );

    // Handle Redis connection errors for subscriber
    this.subscriber.on('error', (err) =>
      this.logger.error('Subscriber Redis error:', err),
    );
  }

  /**
   * Publishes a message to a specified Redis channel.
   * @param channel - The Redis channel to publish to.
   * @param message - The message to be published.
   * @returns A promise that resolves to the number of clients that received the message.
   */
  async publish(channel: string, message: string): Promise<number> {
    try {
      const result = await this.publisher.publish(channel, message);
      this.logger.log(`Message published to ${channel}`);

      return result;
    } catch (error) {
      this.logger.error(`Failed to publish message to ${channel}`, error);
      throw error;
    }
  }

  /**
   * Subscribes to a Redis channel to listen for incoming messages.
   * @param channel - The channel to subscribe to.
   * @param callback - A function to handle incoming messages.
   */

  async subscribe(channel: string, callback: (message: string) => void) {
    // Prevent duplicate subscriptions
    if (this.callbackMap.has(channel)) {
      this.logger.warn(`Already subscribed to channel: ${channel}`);
      return;
    }

    this.callbackMap.set(channel, callback);

    // Subscribe to the channel
    await this.subscriber.subscribe(channel, (err) => {
      if (err)
        throw new Error(`Failed to subscribe to ${channel}: ${err.message}`);
    });

    // Listen for incoming messages on subscribed channels

    this.subscriber.on('message', (ch, msg) => {
      if (ch === channel) {
        try {
          callback(msg);
        } catch (error) {
          this.logger.error(`Error in channel ${channel} callback:`, error);
        }
      }
    });

    this.logger.log(`Subscribed to channel: ${channel}`);
  }

  //Close Redis connections when the application is shutting down.

  async onModuleDestroy() {
    try {
      await this.publisher.quit();
      this.logger.log('Publisher Redis connection closed.');
    } catch (error) {
      this.logger.error('Error closing Publisher Redis connection:', error);
    }

    try {
      await this.subscriber.quit();
      this.logger.log('Subscriber Redis connection closed.');
    } catch (error) {
      this.logger.error('Error closing Subscriber Redis connection:', error);
    }
  }
}
