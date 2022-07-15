import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UsersCmdService } from './cmd.service';
import { AuthService } from 'src/auth/auth.service';
import { UserRolesModule } from 'src/user-role/user-role.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), UserRolesModule],
  providers: [UsersService, UsersCmdService, AuthService],
  exports: [UsersService, UsersCmdService],
})
export class UsersModule {}
