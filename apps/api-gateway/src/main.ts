import { NestFactory } from '@nestjs/core';
import { ApiGatewayModule } from './api-gateway.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(ApiGatewayModule);

  // Enable validation globally
  app.useGlobalPipes(new ValidationPipe());

  // Enable CORS for frontend requests
  app.enableCors();

  // Microservice Configuration
  app.connectMicroservice({
    transport: Transport.TCP, // Transport layer (can use NATS, RabbitMQ, etc.)
    options: {
      host: '0.0.0.0',
      port: 3001, // API Gateway listens on port 3001
    },
  });

  await app.startAllMicroservices();
  await app.listen(3000); // Main API Gateway port

  Logger.log('🚀 API Gateway is running on http://localhost:3000');

  await app.listen(process.env.port ?? 3000);
}
void bootstrap();
