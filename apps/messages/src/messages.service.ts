import { Injectable, Logger } from '@nestjs/common';
import { Message } from './schemas/message.schema';
import { DeleteResult, Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class MessagesService {
  // Logger instance to log errors
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    @InjectModel(Message.name) private messageModel: Model<Message>,
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
      const messages = await this.messageModel
        .find({ groupId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .exec();

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
