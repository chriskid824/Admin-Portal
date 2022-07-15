// service.ts - a nestjs provider using console decorators
import { Console, Command } from 'nestjs-console';
import { AuthService } from 'src/auth/auth.service';
import { Role } from 'src/user-role/role.enum';
import { UserRolesService } from 'src/user-role/user-role.service';
import { UsersService } from './users.service';

@Console({
  command: 'user',
  description: 'user command',
})
export class UsersCmdService {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private usersRolesService: UserRolesService,
  ) {}
}
