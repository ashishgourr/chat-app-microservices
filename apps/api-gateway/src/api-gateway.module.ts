import { Module } from '@nestjs/common';
import { ApiGatewayController } from './api-gateway.controller';
import { ApiGatewayService } from './api-gateway.service';
import { HttpModule } from '@nestjs/axios';
import { UsersController } from './controllers/users.controller';

@Module({
  imports: [HttpModule],
  controllers: [ApiGatewayController, UsersController],
  providers: [ApiGatewayService],
})
export class ApiGatewayModule {}
