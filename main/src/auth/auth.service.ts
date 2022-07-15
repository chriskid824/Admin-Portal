import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService) {}

  async validateUser(email: string): Promise<any> {
    // Check if email is under kickscrew domain
    if (!email.endsWith('@kickscrew.com')) {
      return null;
    }
    // Get a user by email. We use email as an ID for this app.
    const user = await this.usersService.getOneActiveUser(email);
    if (!user) {
      // This password is not actually used but just in case there's a
      // regression in the future, this will be more secure.
      const password = Math.random().toString(36);
      // Create a user with the given email.
      return await this.usersService.create({
        username: email,
        password,
      });
    } else {
      return user;
    }
  }
}
