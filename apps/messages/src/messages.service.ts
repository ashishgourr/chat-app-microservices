import { Injectable, Logger } from '@nestjs/common';
import { Message } from './schemas/message.schema';
import { DeleteResult, Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { CachingService } from 'apps/caching/src/caching.service';

@Injectable()
export class MessagesService {
  // Logger instance to log errors
  private readonly logger = new Logger(MessagesService.name);

  private readonly MESSAGE_CACHE_TTL = 300; // 5 minutes

  constructor(
    @InjectModel(Message.name) private messageModel: Model<Message>,
    private readonly cachingService: CachingService,
  ) {}

  /**
   * Save a new message to the database.
   * @param userId - ID of the user sending the message.
   * @param groupId - ID of the group where the message is sent.
   * @param content - Message content.
   * @returns The saved message document.
   */
  async saveMessage(userId: string, groupId: string, content: string) {
    try {
      const message = new this.messageModel({
        userId,
        groupId,
        content,
        timestamp: new Date(),
      });

      const savedMessage = await message.save();
      this.logger.log(`Message saved successfully for group: ${groupId}`);

      // Invalidate cache on message creation
      const cacheKey = `chat:history:${groupId}`;
      await this.cachingService.delete(cacheKey);

      return savedMessage;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Error saving message for group ${groupId}: ${error.message}`,
          error.stack,
        );
      } else {
        throw new Error('Failed to save message');
      }
    }
  }

  /**
   * Retrieve the message history for a specific group.
   * @param groupId - ID of the group.
   * @param limit - Maximum number of messages to retrieve (default: 100).
   * @returns List of messages sorted by timestamp in descending order.
   */
  async getMessageHistory(groupId: string, limit = 100) {
    try {
      const cacheKey = `chat:history:${groupId}:${limit}`;

      // Check cache for recent messages
      const cachedMessages = await this.cachingService.get(cacheKey);
      if (cachedMessages) {
        this.logger.log(`Cache hit for group: ${groupId}`);
        return cachedMessages;
      }
      const messages = await this.messageModel
        .find({ groupId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .exec();

      if (messages.length > 0) {
        await this.cachingService.set(
          cacheKey,
          messages,
          this.MESSAGE_CACHE_TTL,
        );
      }

      this.logger.log(
        `Retrieved ${messages.length} messages for group: ${groupId}`,
      );
      return messages;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Error retrieving messages for group ${groupId}: ${error.message}`,
          error.stack,
        );
      } else {
        throw new Error('Failed to retrieve message history');
      }
    }
  }

  /**
   * Delete all messages from a specific group.
   * @param groupId - ID of the group to delete messages from.
   * @returns DeleteResult containing the number of documents deleted.
   */
  async deleteMessagesByGroup(groupId: string): Promise<DeleteResult | null> {
    try {
      const result = await this.messageModel
        .deleteMany({ groupId })
        .lean()
        .exec();

      if (result.deletedCount === 0) {
        this.logger.warn(`No messages found to delete for group: ${groupId}`);
      } else {
        this.logger.log(
          `Deleted ${result.deletedCount} messages for group: ${groupId}`,
        );
        await this.cachingService.delete(`chat:history:${groupId}`);
      }

      return result;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Error deleting messages for group ${groupId}: ${error.message}`,
          error.stack,
        );
      } else {
        this.logger.error(
          `Unknown error occurred while deleting messages for group ${groupId}`,
        );
      }
      return null;
    }
  }
}
