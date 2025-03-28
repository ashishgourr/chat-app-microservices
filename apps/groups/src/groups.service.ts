import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { Group } from './entities/group.entity';
import { InjectRepository } from '@nestjs/typeorm';

import { CreateGroupDto } from './dtos/create-group.dto';
import { GroupRole } from './enums/group-role.enum';
import { AddMemberToGroupDto } from './dtos/add-member-to-group.dto';
import { GroupMember } from './entities/group-member.entity';
import { UpdateMemberRoleDto } from './dtos/update-member-role.dto';
import { CachingService } from 'apps/caching/src/caching.service';

@Injectable()
export class GroupsService {
  private readonly logger = new Logger(GroupsService.name);
  private readonly GROUP_CACHE_TTL = 3600; // 1 hour
  private readonly MEMBERSHIP_CACHE_TTL = 1800; // 30 minutes

  constructor(
    @InjectRepository(Group) private groupRepository: Repository<Group>,
    @InjectRepository(GroupMember)
    private groupMemberRepository: Repository<GroupMember>,
    private readonly cachingService: CachingService,
  ) {}

  /**
   * Create a new group and assign the creator as an ADMIN.
   */
  async createGroup(
    userId: string,
    createGroupDto: CreateGroupDto,
  ): Promise<Group> {
    try {
      const group = this.groupRepository.create({
        name: createGroupDto.name,
        createdBy: userId,
      });

      await this.groupRepository.save(group);

      // Add creator as ADMIN
      await this.groupMemberRepository.save({
        group,
        userId,
        role: GroupRole.ADMIN,
      });

      //Cache the new group
      await this.cachingService.set(
        `group:${group.id}`,
        group,
        this.GROUP_CACHE_TTL,
      );

      this.logger.log(
        `Group created with ID: ${group.id} by User ID: ${userId}`,
      );

      return group;
    } catch (error) {
      if (error instanceof Error)
        this.logger.error(
          `Failed to create group: ${error.message}`,
          error.stack,
        );
      throw error;
    }
  }

  /**
   * Get group with caching
   */
  async getGroup(groupId: string): Promise<Group> {
    const cacheKey = `group:${groupId}`;

    // Try cache first
    const cached = await this.cachingService.get<Group>(cacheKey);
    if (cached) return cached;

    // Fallback to DB
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['members'],
    });

    if (group) {
      await this.cachingService.set(cacheKey, group, this.GROUP_CACHE_TTL);
    }

    return group as Group;
  }

  /**
   * Add a new member to a group. Only ADMINs can perform this action.
   */
  async addMemberToGroup(
    adminId: string,
    addMemberToGroupDto: AddMemberToGroupDto,
  ) {
    try {
      const group = await this.groupRepository.findOne({
        where: { id: addMemberToGroupDto.groupId },
        relations: ['members'],
      });

      if (!group) throw new NotFoundException('Group not found');

      // Check if requester is ADMIN

      const isAdmin = group.members.some(
        (member) =>
          member.userId === adminId && member.role === GroupRole.ADMIN,
      );

      if (!isAdmin) throw new ForbiddenException('Only admins can add users');

      // Check if the user is already a member of the group
      const isAlreadyMember = group.members.some(
        (member) => member.userId === addMemberToGroupDto.userId,
      );

      if (isAlreadyMember) {
        throw new ForbiddenException('User is already a member of the group');
      }

      const newMember = this.groupMemberRepository.create({
        groupId: addMemberToGroupDto.groupId,
        userId: addMemberToGroupDto.userId,
        role: addMemberToGroupDto.role || GroupRole.MEMBER,
      });

      await this.groupMemberRepository.save(newMember);

      this.logger.log(
        `User ${addMemberToGroupDto.userId} added to Group ${group.id}`,
      );

      return newMember;
    } catch (error) {
      if (error instanceof Error)
        this.logger.error(
          `Failed to add member: ${error.message}`,
          error.stack,
        );
      throw error;
    }
  }

  /**
   * Remove a member from the group. Only ADMINs can perform this action.
   */
  async removeMemberFromGroup(
    adminId: string,
    groupId: string,
    userId: string,
  ) {
    try {
      const group = await this.groupRepository.findOne({
        where: { id: groupId },
        relations: ['members'],
      });

      if (!group) throw new NotFoundException('Group not found');

      // Check if requester is ADMIN
      const isAdmin = group.members.some(
        (member) =>
          member.userId === adminId && member.role === GroupRole.ADMIN,
      );

      if (!isAdmin)
        throw new ForbiddenException('Only admins can remove users');

      return this.groupMemberRepository.delete({
        group: { id: groupId },
        userId,
      });
    } catch (error) {
      if (error instanceof Error)
        this.logger.error(
          `Failed to remove member from the group: ${error.message}`,
          error.stack,
        );
      throw error;
    }
  }

  /**
   * Update a member's role within the group. Only ADMINs can perform this action.
   */
  async updateMemberRole(
    adminId: string,
    updateMemberRoleDto: UpdateMemberRoleDto,
  ) {
    try {
      const group = await this.groupRepository.findOne({
        where: { id: updateMemberRoleDto.groupId },
        relations: ['members'],
      });

      if (!group) throw new NotFoundException('Group not found');

      // Check if requester is ADMIN
      const isAdmin = group.members.some(
        (member) =>
          member.userId === adminId && member.role === GroupRole.ADMIN,
      );

      if (!isAdmin)
        throw new ForbiddenException('Only admins can change roles');

      const memberToUpdate = group.members.find(
        (member) => member.userId === updateMemberRoleDto.userId,
      );
      if (!memberToUpdate)
        throw new NotFoundException('User is not a member of this group');

      await this.groupMemberRepository.update(
        {
          group: { id: updateMemberRoleDto.groupId },
          userId: updateMemberRoleDto.userId,
        },
        { role: updateMemberRoleDto.role },
      );

      this.logger.log(
        `User ${updateMemberRoleDto.userId}'s role updated to ${updateMemberRoleDto.role} in Group ${updateMemberRoleDto.groupId}`,
      );

      return { message: 'Member Role updated successfully' };
    } catch (error) {
      if (error instanceof Error)
        this.logger.error(
          `Failed to update member role: ${error.message}`,
          error.stack,
        );
      throw error;
    }
  }

  /**
   * Delete a group. Only ADMINs can perform this action.
   */
  async deleteGroup(adminId: string, groupId: string) {
    try {
      const group = await this.groupRepository.findOne({
        where: { id: groupId },
        relations: ['members'],
      });

      if (!group) throw new NotFoundException('Group not found');

      // Check if requester is ADMIN
      const isAdmin = group.members.some(
        (member) =>
          member.userId === adminId && member.role === GroupRole.ADMIN,
      );

      if (!isAdmin)
        throw new ForbiddenException('Only admins can delete groups');

      await this.groupRepository.delete(groupId);

      this.logger.log(`Group ${groupId} deleted by Admin ${adminId}`);
      return { message: 'Group deleted successfully' };
    } catch (error) {
      if (error instanceof Error)
        this.logger.error(
          `Failed to delete group: ${error.message}`,
          error.stack,
        );
      throw error;
    }
  }
}
