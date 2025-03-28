import { Module } from '@nestjs/common';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupMember } from './entities/group-member.entity';
import { Group } from './entities/group.entity';
import { CommonModule } from '@app/common';
import { CachingModule } from 'apps/caching/src/caching.module';

@Module({
  imports: [
    CommonModule,
    CachingModule,
    TypeOrmModule.forFeature([Group, GroupMember]),
  ],
  controllers: [GroupsController],
  providers: [GroupsService],
})
export class GroupsModule {}
