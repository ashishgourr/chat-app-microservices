import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { User } from '../entities/user.entity';
import { Request } from 'express';
import { UserRole } from '../enums/user-role.enum';

//  Extend Express Request to include `user`
interface AuthenticatedRequest extends Request {
  user?: User;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Accesses metadata associated with a route using Reflector
    const requiredRoles = this.reflector.get<UserRole[]>(
      'roles',
      context.getHandler(),
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No roles specified, allow access
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // Ensure user exists before accessing its role
    if (!request.user) {
      return false; // No user found, deny access
    }

    // Deny if user has no role
    if (!request.user.role) {
      throw new ForbiddenException('User role missing');
    }

    // Check role inclusion
    const hasRole = requiredRoles.includes(request.user.role);
    if (!hasRole) {
      throw new ForbiddenException(
        `Requires one of these roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
