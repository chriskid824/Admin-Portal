import { Body, Controller, Get, Param, Post, Render, Request, Res, UseGuards } from '@nestjs/common';
import { Roles } from 'src/auth/roles.decorator';
import { UserRolesService } from 'src/user-role/user-role.service';
import { Role } from '../user-role/role.enum';
import { User } from './user.entity';
import { UsersService } from './users.service';

@Controller('user')
export class UsersController {
  constructor(
    private usersService: UsersService, 
    private userRolesService: UserRolesService,
  ) {}

  @Get('all')
  @Render('users')
  @Roles(Role.Admin)
  async allUser() {
    const all_users = await this.usersService.getAll();
    return { users: all_users };
  }

  serializeUser(user: User): any {
    const { roles = [], ...rest } = user;
    const rolesId = roles.map(role => role.roleId.toString());
    const userRoles = Object.keys(Role).filter(key => !isNaN(Number(key))).map(key => ({
      key, value: Role[key], hasRole: rolesId.includes(key),
    }));
    return { ...rest, roles: userRoles };
  }

  @Get('/me')
  @Render('user')
  async viewMe(@Request() req) {
    const { user } = req;
    const serializeUser = this.serializeUser(user);
    const readonly = true;
    return { user: serializeUser, readonly };
  }

  @Get('/:id')
  @Render('user')
  @Roles(Role.Admin)
  async viewUser(@Param('id') id: number) {
    try {
      const user = await this.usersService.getOneById(id);
      const serializeUser = this.serializeUser(user);
      return { user: serializeUser };
    } catch (error) {
      return {id}
    }
  }

  @Post('/:id')
  @Roles(Role.Admin)
  async updateUser(@Param('id') id: number, @Body() body, @Res() res) {
    console.log('user::update_user::body', body);
    const { roles = [] } = body;
    const roleIds = roles.map(role => Role[role]);
    console.log(roleIds);
    const user = await this.usersService.getOneById(id);
    const result = await this.userRolesService.updateRoleByUser(user, roleIds);
    // const result = await this.usersService.updateRoles(id, roleIds);
    // console.log('result', result);
    res.redirect('/user/all');
  }

  @Post('/:id/delete')
  @Roles(Role.Admin)
  async deleteUser(@Param('id') id: number, @Res() res) {
    await this.usersService.disableUser(id);
    res.redirect('/user/all');
  }
}
