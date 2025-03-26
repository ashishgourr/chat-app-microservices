import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { UsersService } from './users.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  validate() {
    throw new Error('Method not implemented.');
  }
  constructor(private readonly userService: UsersService) {
    super({ usernameField: 'email' });
  }
}
