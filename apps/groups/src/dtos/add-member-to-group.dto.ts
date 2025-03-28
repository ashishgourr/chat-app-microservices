import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { GroupRole } from '../enums/group-role.enum';

export class AddMemberToGroupDto {
  @IsString()
  @IsNotEmpty()
  groupId: string;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsEnum(GroupRole, { message: 'Invalid role' })
  role: GroupRole;
}
