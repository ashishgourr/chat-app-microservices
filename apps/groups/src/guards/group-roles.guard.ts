import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { GroupMember } from '../entities/group-member.entity';
import { GroupRole } from '../enums/group-role.enum';
import { RequestWithUser } from '../interfaces/request-with-user.interface';

/**
 * GroupRolesGuard is a custom guard responsible for checking
 * whether a user has the required role to access a particular endpoint.
 * It uses role-based access control (RBAC) by checking metadata.
 */
export class GroupRolesGuard implements CanActivate {
  // Logger to capture important events and errors
  private readonly logger = new Logger(GroupRolesGuard.name);

  /**
   * Constructor to inject required dependencies
   * @param reflector - Used to read custom metadata from routes (e.g., roles required)
   * @param groupMemberRepository - Repository to fetch group member details from the database
   */
  constructor(
    private reflector: Reflector,
    @InjectRepository(GroupMember)
    private groupMemberRepository: Repository<GroupMember>,
  ) {}

  /**
   * Main method to check whether the request is authorized based on user roles.
   *
   * @param context - Provides details about the current request (e.g., handler, class, request object)
   * @returns boolean - `true` if the user has access, otherwise it throws an error
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      /**
       * Extract required roles from metadata using Reflector
       * - First, it checks the method-level metadata using `getHandler()`
       * - If no roles are found, it checks the class-level metadata using `getClass()`
       */

      const requiredRoles =
        this.reflector.get<GroupRole[]>('groupRoles', context.getHandler()) ||
        this.reflector.get<GroupRole[]>('groupRoles', context.getClass());

      // If no roles are defined, it means the route is public or no special access is required
      if (!requiredRoles || requiredRoles.length === 0) {
        this.logger.debug('No specific roles required. Access granted.');
        return true;
      }

      /**
       * Extract request and user information from the context
       * - `switchToHttp().getRequest()` fetches the HTTP request object
       * - `RequestWithUser` interface ensures type safety
       */
      const request = context.switchToHttp().getRequest<RequestWithUser>();
      const { groupId } = request.params; // Group ID from URL params
      const userId = request.user.userId; // User ID from decoded JWT token

      // Ensure the groupId is provided, otherwise throw an error
      if (!groupId) {
        this.logger.error('Missing groupId in request parameters.');
        throw new ForbiddenException('Group ID is required for access.');
      }

      // Ensure the userId is available from the authenticated request
      if (!userId) {
        this.logger.error('User information missing in the request.');
        throw new ForbiddenException('User authentication failed.');
      }

      /**
       * Check if the user is a member of the specified group
       */
      const membership = await this.groupMemberRepository.findOne({
        where: { groupId, userId },
        select: ['role'],
      });

      if (!membership) {
        this.logger.warn(`User ${userId} not found in group ${groupId}`);
        throw new ForbiddenException(
          'You are not authorized to access this group',
        );
      }

      /**
       * Validate if the user has one of the required roles
       * - `requiredRoles.includes()` checks if the user's role matches any allowed role
       */

      if (!requiredRoles.includes(membership.role)) {
        this.logger.warn(
          `User ${userId} with role ${membership.role} tried to access a resource requiring roles: ${requiredRoles.join(', ')}`,
        );
        throw new ForbiddenException(
          `Access denied. Required roles: ${requiredRoles.join(', ')}`,
        );
      }
      // If all checks pass, log success and allow access
      this.logger.log(`User ${userId} authorized to access group ${groupId}.`);
      return true;
    } catch (error) {
      if (error instanceof Error)
        this.logger.error(`Authorization failed: ${error.message}`);
      throw error;
    }
  }
}
