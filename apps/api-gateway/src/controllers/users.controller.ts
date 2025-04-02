import { HttpService } from '@nestjs/axios';
import { Body, Controller, Post } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

@Controller('users')
export class UsersController {
  constructor(private readonly httpService: HttpService) {}

  private USERS_SERVICE_URL = 'http://localhost:3001/auth';

  @Post('signup')
  async signup(@Body() data: any) {
    return firstValueFrom(
      this.httpService.post(`${this.USERS_SERVICE_URL}/signup`, data),
    );
  }

  @Post('login')
  async login(@Body() data: any) {
    return firstValueFrom(
      this.httpService.post(`${this.USERS_SERVICE_URL}/login`, data),
    );
  }
}
