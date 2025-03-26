import { Body, Controller, Post, ValidationPipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { SignupDto } from './dtos/signup.dto';
import { LoginDto } from './dtos/login.dto';

@Controller('auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('/signup')
  signup(@Body(ValidationPipe) signupDto: SignupDto) {
    return this.usersService.signup(signupDto);
  }

  @Post('/login')
  login(@Body(ValidationPipe) loginDto: LoginDto) {
    return this.usersService.login(loginDto);
  }
}
