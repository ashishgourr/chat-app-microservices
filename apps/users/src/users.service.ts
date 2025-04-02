import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { SignupDto } from './dtos/signup.dto';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dtos/login.dto';
import { User } from './entities/user.entity';
import { CachingService } from 'apps/caching/src/caching.service';

@Injectable()
export class UsersService {
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly ATTEMPT_TTL = 300; // 5 minutes
  private readonly SESSION_TTL = 3600; // 1 hour
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    private jwtService: JwtService,
    private cachingService: CachingService,
  ) {}

  /**
   * User Signup
   * @param signupDto - DTO containing user signup details
   */
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

    // Cache the user profile data for quick access
    await this.cachingService.set(`user:profile:${result.id}`, {
      id: result.id,
      email: result.email,
      role: result.role,
    });

    return result;
  }

  /**
   * Validate User Credentials
   * @param email - User's email
   * @param password - User's password
   */
  async validateUser(email: string, password: string): Promise<any> {
    // Fetch the user by email
    const user = await this.userRepository.findOne({ where: { email } });

    if (user && (await bcrypt.compare(password, user.password))) {
      return user;
    }
    throw new UnauthorizedException('Invalid credentials');
  }

  /**
   * User Login with JWT Generation
   * Implements Caching for Session Management and Rate Limiting
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Check and enforce rate limiting for failed login attempts
    const attemptsKey = `login:attempts:${email}`;
    const attempts = (await this.cachingService.get<number>(attemptsKey)) || 0;

    if (attempts >= this.MAX_LOGIN_ATTEMPTS) {
      throw new UnauthorizedException(
        'Too many login attempts. Please Try again later.',
      );
    }

    //  Check if user exists
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      await this.cachingService.set(
        attemptsKey,
        attempts + 1,
        this.ATTEMPT_TTL,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    console.log(user.password.trim());

    const newHash = await bcrypt.hash(password, 10);
    console.log('New Hash:', newHash);
    console.log('Compare:', await bcrypt.compare(password, newHash));

    // Validate the password
    const isPasswordValid = await bcrypt.compare(
      password.trim(),
      user.password.trim(),
    );

    console.log(isPasswordValid);
    if (!isPasswordValid) {
      await this.cachingService.set(
        attemptsKey,
        attempts + 1,
        this.ATTEMPT_TTL,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed attempts on successful login
    await this.cachingService.delete(attemptsKey);

    // Generate JWT with user role
    const payload = { email: user.email, role: user.role, sub: user.id };

    // Generate access token
    const token = this.jwtService.sign(payload);

    // Generate a refresh token
    const refreshToken = this.jwtService.sign(
      { userId: user.id },
      { expiresIn: '7d' }, // Refresh token expires in 7 days
    );

    // Save and update the refresh token in the database
    user.refreshToken = refreshToken;
    await this.userRepository.save(user);

    // Cache session data for quick retrieval
    await this.cachingService.set(
      `session:user:${user.id}`,
      {
        token,
        refreshToken,
        role: user.role,
      },
      this.SESSION_TTL,
    );

    // Cache user profile for faster lookups
    await this.cachingService.set(
      `user:profile:${user.id}`,
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      this.SESSION_TTL,
    );

    return {
      access_token: token,
      refreshToken: refreshToken,
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  /**
   * Logout and Clear Session
   * @param userId - The ID of the user to log out
   */
  async logout(userId: string) {
    await this.cachingService.delete(`session:user:${userId}`);
    return { message: 'Successfully logged out' };
  }

  /**
   * Get User Profile from Cache or Database
   * @param userId - The ID of the user
   */
  async getUserProfile(userId: string) {
    // Try fetching from cache
    const cachedUser = await this.cachingService.get(`user:profile:${userId}`);
    if (cachedUser) {
      return cachedUser;
    }

    // Fetch from database if not found in cache
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Cache user data for future requests
    await this.cachingService.set(
      `user:profile:${user.id}`,
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      this.SESSION_TTL,
    );

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
