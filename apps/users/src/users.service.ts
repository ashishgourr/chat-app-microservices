import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { SignupDto } from './dtos/signup.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dtos/login.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async signup(signupDto: SignupDto) {
    const { username, email, password, role } = signupDto;

    //Check if user already exists

    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException(
        `The email ${email} is already registered. Please use a different email.`,
      );
    }

    // Hash the password

    const salt = await bcrypt.genSalt(10);

    const hashedPassword = await bcrypt.hash(password, salt);

    // Create and save the user

    const user = this.userRepository.create({
      username,
      email,
      password: hashedPassword,
      role,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...result } = await this.userRepository.save(user);
    return result;
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({ where: { email } });

    if (user && (await bcrypt.compare(password, user.password))) {
      return user;
    }
    throw new UnauthorizedException('Invalid credentials');
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find the user by email

    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Validate the password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT with user role

    const payload = { email: user.email, role: user.role, sub: user.id };

    // Generate access token
    const token = this.jwtService.sign(payload);

    // Generate refresh token

    const refreshToken = this.jwtService.sign(
      { userId: user.id },
      { expiresIn: '7d' }, // Refresh token expires in 7 days
    );

    // Save the refresh token in the database
    user.refreshToken = refreshToken;
    await this.userRepository.save(user);

    return {
      access_token: token,
      refreshToken: refreshToken,
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }
}
