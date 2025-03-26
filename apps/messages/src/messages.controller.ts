/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Controller, Get, Logger } from '@nestjs/common';
import { MessagesService } from './messages.service';
import {
  HealthCheck,
  HealthCheckService,
  MongooseHealthIndicator,
} from '@nestjs/terminus';
@Controller()
export class MessagesController {
  private readonly logger = new Logger(MessagesController.name);

  constructor(
    private readonly messagesService: MessagesService,
    private health: HealthCheckService,
    private db: MongooseHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  async checkHealth() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      return await this.health.check([() => this.db.pingCheck('mongodb')]);
    } catch (error) {
      this.logger.error('Health check failed', error);
      throw error;
    }
  }
}
