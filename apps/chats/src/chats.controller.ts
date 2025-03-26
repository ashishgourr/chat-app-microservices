import { Controller, Logger } from '@nestjs/common';
import { ChatsService } from './chats.service';
import { GrpcMethod, GrpcStreamMethod } from '@nestjs/microservices';
import { ChatMessage } from './interfaces/chat-message.interface.';
import { MessageResponse } from './interfaces/message-response.interface';
import { catchError, map, Observable, of } from 'rxjs';
import { MessageHistoryRequest } from './apps/chats/src/protos/chat';

@Controller()
export class ChatsController {
  private readonly logger = new Logger(ChatsController.name);
  constructor(private readonly chatsService: ChatsService) {}

  /**
   * Handles the SendMessage RPC call from the gRPC client.
   * Sends a message using the ChatService and returns a response with status.
   *
   * @param data ChatMessage containing userId, content, and optional groupId
   * @returns MessageResponse with status and timestamp
   */
  @GrpcMethod('ChatService', 'SendMessage')
  async sendMessage(data: ChatMessage): Promise<MessageResponse> {
    try {
      const result = await this.chatsService.handleMessage(data);

      return {
        userId: result.userId,
        content: result.content,
        timestamp: result.timestamp || new Date().toISOString(),
        status: 'SENT',
      };
    } catch (error) {
      this.logger.error('Error while sending message:', error);

      return {
        userId: data.userId,
        content: data.content,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'FAILED',
      };
    }
  }

  /**
   * Handles the ChatStream RPC for bidirectional chat using gRPC.
   * Listens to incoming messages and sends back status responses.
   */

  @GrpcStreamMethod('ChatService', 'ChatStream')
  receiveMessages(data$: Observable<ChatMessage>): Observable<MessageResponse> {
    return this.chatsService.handleMessageStream(data$).pipe(
      map(
        (message: ChatMessage): MessageResponse => ({
          userId: message.userId,
          content: message.content,
          timestamp: message.timestamp || new Date().toISOString(),
          status: 'SENT',
        }),
      ),
      catchError((error) => {
        this.logger.error('Error in ChatStream:', error);

        // Return an error response using `of()`
        return of({
          userId: '',
          content: '',
          timestamp: new Date().toISOString(),
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
        } as MessageResponse);
      }),
    );
  }

  @GrpcMethod('ChatService', 'GetMessagesHistory')
  async getMessagesHistory(data: MessageHistoryRequest) {
    const messages = await this.chatsService.getMessageHistory(
      data.groupId,
      data.limit,
    );

    return { messages };
  }
}
