import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { RedisService } from './services/redis.service';
import { catchError, from, mergeMap, Observable, of, Subject } from 'rxjs';
import { ChatMessage } from './interfaces/chat-message.interface.';
import { MessagesService } from 'apps/messages/src/messages.service';
import { CachingService } from 'apps/caching/src/caching.service';

@Injectable()
export class ChatsService implements OnModuleInit, OnModuleDestroy {
  // Logger instance to log errors
  private readonly logger = new Logger(ChatsService.name);

  // Subject acts as an observable and observer for real-time message streaming
  private messageStream = new Subject<ChatMessage>();

  private destroy$ = new Subject<void>(); // For cleanup

  // Cache TTL (5 Minutes)
  private readonly MESSAGE_CACHE_TTL = 300;

  constructor(
    private readonly redisService: RedisService,
    private readonly messageService: MessagesService,
    private readonly cachingService: CachingService,
  ) {}

  /**
   * Lifecycle hook that initializes the Redis subscription when the module is loaded.
   */

  async onModuleInit() {
    try {
      // Subscribe to Redis channel 'chat_messages' to listen for incoming messages
      await this.redisService.subscribe('chat_messages', (msg: string) => {
        try {
          // Parse and validate the message
          const message = this.parseMessage(msg);
          // Push the parsed message to the stream
          this.messageStream.next(message);

          // Cache real-time messages temporarily

          const cacheKey = `chat:message:${message.groupId}`;
          void this.cachingService.set(
            cacheKey,
            message,
            this.MESSAGE_CACHE_TTL,
          );
        } catch (error) {
          this.logger.error(error, 'Failed to parse incoming message');
        }
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        this.logger.error('Redis subscription failed', err.stack);
      } else {
        this.logger.error('Redis subscription failed', String(err));
      }
    }
  }

  async onModuleDestroy() {
    this.logger.log('Cleaning up chat service...');

    // Complete the destroy$ subject to trigger takeUntil
    this.destroy$.next();
    this.destroy$.complete();
    // Complete the message stream
    this.messageStream.complete();
    //Clean up Redis connections (assuming RedisService implements OnModuleDestroy)
    await this.redisService.onModuleDestroy();
  }

  /**
   * Handles incoming messages, enriches them with a timestamp, and publishes them to Redis.
   */
  async handleMessage(message: ChatMessage): Promise<ChatMessage> {
    try {
      // Append a timestamp to the message for tracking
      const enrichedMessage = {
        ...message,
        timestamp: new Date().toISOString(),
      };

      // Save to MongoDB

      await this.messageService.saveMessage(
        message.userId,
        message.groupId ?? '',
        message.content,
      );

      //Cache the message

      const cacheKey = `chat:message:${message.groupId}`;

      await this.cachingService.set(
        cacheKey,
        enrichedMessage,
        this.MESSAGE_CACHE_TTL,
      );

      // Publish the enriched message to the Redis channel

      await this.redisService.publish(
        'chat_messages',
        JSON.stringify(enrichedMessage),
      );

      return enrichedMessage;
    } catch (error) {
      this.logger.error(
        'Failed to handle message',
        error instanceof Error ? error.stack : String(error),
      );
      throw new Error('Failed to handle message');
    }
  }

  /**
   * Handles a stream of chat messages using RxJS operators.
   * ( data$ ) Observable stream of ChatMessage objects.
   */
  handleMessageStream(data$: Observable<ChatMessage>): Observable<ChatMessage> {
    data$
      .pipe(
        // Use mergeMap to handle async operations from handleMessage
        mergeMap((message) =>
          from(this.handleMessage(message)).pipe(
            catchError((err) => {
              this.logger.error('Error handling message:', err);
              // Return null or an empty observable on error
              return of(null);
            }),
          ),
        ),
      )
      .subscribe((result) => {
        // Only push non-null messages to the stream
        if (result) {
          this.messageStream.next(result);
        }
      });

    // Return the observable stream for consumers

    return this.messageStream.asObservable();
  }

  /**
   * Retrieve Message History with Caching
   */

  async getMessageHistory(groupId: string, limit: number) {
    const cacheKey = `chat:history:${groupId}:${limit}`;

    //Check cache for the messages

    const cachedMessages = await this.cachingService.get(cacheKey);
    if (cachedMessages) {
      this.logger.log(`Cache hit for group ${groupId}`);
      return cachedMessages;
    }

    // Fetch from the Database if cache is empty
    const messages =
      (await this.messageService.getMessageHistory(groupId, limit)) || [];

    await this.cachingService.set(cacheKey, messages, this.MESSAGE_CACHE_TTL);

    return messages;
  }

  //Parses a JSON string into a ChatMessage object
  private parseMessage(message: string): ChatMessage {
    try {
      const parsedMessage = JSON.parse(message) as ChatMessage;

      if (!parsedMessage?.userId || !parsedMessage?.content) {
        throw new Error(
          'Invalid message format. userId and content are required.',
        );
      }

      return parsedMessage;
    } catch (error) {
      throw new Error(
        `Failed to parse message: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
