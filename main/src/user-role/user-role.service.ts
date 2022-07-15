import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/user.entity';
import { Repository } from 'typeorm';
import { UserRole } from './user-role.entity';

@Injectable()
export class UserRolesService {
  constructor(
    @InjectRepository(UserRole) private userRolesRepository: Repository<UserRole>,
  ) {}

  async getAll(): Promise<UserRole[]> {
    return this.userRolesRepository.find();
  }

  async getRoleByUserId(id: number): Promise<UserRole[]> {
    const user_roles = await this.userRolesRepository.find({ userId: id });
    return user_roles;
  }

  async updateRoleByUser(user: User, roleIds: number[]): Promise<User> {
    // const user = await this.usersService.getOneById(userId);
    const pre_roles = user.roles || [];
    // soft delete previous roles
    let previous_roles_soft_remove;
    if (pre_roles.length > 0) {
      previous_roles_soft_remove = await this.userRolesRepository.softRemove(user.roles);
    }
    try {
      const newRoles = roleIds.map(roleId => {
        let newRole = this.userRolesRepository.create({ roleId });
        newRole.user = user;
        return newRole;
      });
      user.roles = await this.userRolesRepository.save(newRoles);
      return user;
    } catch (error) {
      console.log('Update User Role failed.')
      console.log("UserRolesService::updateRoleByUserId", error);
      if (previous_roles_soft_remove) {
        await this.userRolesRepository.recover(previous_roles_soft_remove);
      }
      return user;
    }
  }
}
