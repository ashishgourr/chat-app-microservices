import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from 'apps/users/src/entities/user.entity';
import { Group } from 'apps/groups/src/entities/group.entity';
import { GroupMember } from 'apps/groups/src/entities/group-member.entity';

export const typeOrmConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get<string>('DB_HOST'),
  port: configService.get<number>('DB_PORT'),
  username: configService.get<string>('DB_USERNAME'),
  password: configService.get<string>('DB_PASSWORD'),
  database: configService.get<string>('DB_NAME'),
  entities: [User, Group, GroupMember],
  autoLoadEntities: true,
  synchronize: true,
});
