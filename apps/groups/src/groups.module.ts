import { Module } from '@nestjs/common';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupMember } from './entities/group-member.entity';
import { Group } from './entities/group.entity';
import { CommonModule } from '@app/common';
import { CachingModule } from 'apps/caching/src/caching.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from 'apps/users/src/jwt.strategy';

@Module({
  imports: [
    CommonModule,
    CachingModule,
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
    }),
    TypeOrmModule.forFeature([Group, GroupMember]),
  ],
  controllers: [GroupsController],
  providers: [GroupsService, JwtStrategy],
})
export class GroupsModule {}
