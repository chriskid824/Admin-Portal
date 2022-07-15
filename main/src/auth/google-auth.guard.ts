import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * This class handles the authorization from Google OAuth
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  async canActivate(context: ExecutionContext) {
    const result = (await super.canActivate(context)) as boolean;
    const request = context.switchToHttp().getRequest();
    if (!request.user) {
      return true;
    }
    await super.logIn(request);
    return result;
  }

  handleRequest(err, user, info) {
    // You can throw an exception based on either "info" or "err" arguments
    if (err || !user) {
      if ((err && err.status == 401) || !user) {
        return false;
      } else {
        throw err;
      }
    }
    return user;
  }
}
