import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { GroupsService } from './groups.service';

import { CreateGroupDto } from './dtos/create-group.dto';
import { RequestWithUser } from './interfaces/request-with-user.interface';
import { AddMemberToGroupDto } from './dtos/add-member-to-group.dto';
import { UpdateMemberRoleDto } from './dtos/update-member-role.dto';
import { JwtAuthGuard } from 'apps/users/src/guards/jwt-auth.guard';
import { GroupRolesGuard } from './guards/group-roles.guard';
import { GroupRoles } from './decorators/group-roles.decorator';
import { GroupRole } from './enums/group-role.enum';

@Controller('groups')
@UseGuards(JwtAuthGuard) // Applies to all routes
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  createGroup(@Req() req: RequestWithUser, @Body() dto: CreateGroupDto) {
    return this.groupsService.createGroup(req.user.id, dto);
  }

  @Post(':groupId/members')
  @UseGuards(GroupRolesGuard)
  @GroupRoles(GroupRole.ADMIN, GroupRole.MODERATOR) // Admins/moderator can add members
  addMemberToGroup(
    @Req() req: RequestWithUser,
    @Param('groupId') groupId: string,
    @Body() dto: AddMemberToGroupDto,
  ) {
    return this.groupsService.addMemberToGroup(req.user.id, {
      ...dto,
      groupId,
    });
  }

  @Delete(':groupId/members/:userId')
  @UseGuards(GroupRolesGuard)
  @GroupRoles(GroupRole.ADMIN) // Only admins can remove members
  removeMemberFromGroup(
    @Req() req: RequestWithUser,
    @Param('groupId') groupId: string,
    @Param('userId') userId: string,
  ) {
    return this.groupsService.removeMemberFromGroup(
      req.user.id,
      groupId,
      userId,
    );
  }

  @Patch(':groupId/members/:userId/role')
  @UseGuards(GroupRolesGuard)
  @GroupRoles(GroupRole.ADMIN) // Only admins can change roles
  updateMemberRole(
    @Req() req: RequestWithUser,
    @Param('groupId') groupId: string,
    @Param('userId') userId: string,
    dto: UpdateMemberRoleDto,
  ) {
    return this.groupsService.updateMemberRole(req.user.id, {
      ...dto,
      groupId,
      userId,
    });
  }

  @Delete(':groupId')
  @UseGuards(GroupRolesGuard)
  @GroupRoles(GroupRole.ADMIN) // Only admins can delete groups
  deleteGroup(@Req() req: RequestWithUser, @Param('groupId') groupId: string) {
    return this.groupsService.deleteGroup(req.user.id, groupId);
  }
}
