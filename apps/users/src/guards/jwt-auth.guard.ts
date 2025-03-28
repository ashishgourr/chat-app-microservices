import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /**
   * Perform authentication using the parent class's implementation.
   */
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  /**
   * Handle request and manage errors or missing users.
   * Provides detailed error messages.
   */
  handleRequest(err: unknown, user: unknown): any {
    // Type-safe error handling
    if (err || !user) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw err || new UnauthorizedException('Invalid or expired token');
    }

    // Ensure user is an object (not just `any`)
    if (typeof user !== 'object' || user === null) {
      throw new UnauthorizedException('Malformed user payload');
    }

    return user;
  }
}
