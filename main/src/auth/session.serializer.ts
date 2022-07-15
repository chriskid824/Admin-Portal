import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class SessionSerializer extends PassportSerializer {
  constructor(private usersService: UsersService) {
    super();
  }

  serializeUser(user: any, done: (err: Error, user: any) => void): any {
    const { id, username } = user;
    done(null, {id, username});
  }

  async deserializeUser(payload: any, done: (err: Error, payload: any) => void): Promise<any> {
    const user = await this.validate(payload);
    done(null, user);
  }

  async validate(payload: any): Promise<any> {
    const { username } = payload;
    const user = await this.usersService.getOneActiveUser(username);

    if (!user) {
      // throw new UnauthorizedException()
      return false;
    }

    const {password, ...rest} = user;
    return rest;
  }
  // --------------------------------------------------------

  // serializeUser(isAuth: any, done: (err: Error, user: any) => void): any {
  //   done(null, isAuth);
  // }

  // async deserializeUser(
  //   payload: any,
  //   done: (err: Error, payload: any) => void,
  // ): Promise<any> {
  //   done(null, payload);
  // }
}
