import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from 'src/user-role/role.enum';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {
    // super();
  }

  async canActivate(context: ExecutionContext) {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // console.log('RoleGuard::canActivate::requiredRoles', requiredRoles)
    if (!requiredRoles || requiredRoles.length===0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    const { roles = [] } = user;

    const roleIds = roles.map(role =>role.roleId);

    return roleIds.some(roleId => requiredRoles.includes(roleId) || roleId === Role.Admin);
  }
}
