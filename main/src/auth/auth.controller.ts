import {
  Controller,
  Request,
  UseGuards,
  Get,
  Render,
  Res
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './google-auth.guard';
import { UsersService } from 'src/users/users.service';
import { Public } from './auth.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Get()
  @Public()
  @Render('login')
  loginPage(@Request() req) {
    const loginFailed = req.query.loginFailed === 'true';
    if (loginFailed) {
      return { error: 'Login failed.' };
    }
  }

  @Get('logout')
  async logout(@Request() req, @Res() res) {
    await this.clearSession(req);
    res.redirect('/auth');
  }

  @UseGuards(GoogleAuthGuard)
  @Get('federated/accounts.google.com')
  @Public()
  async googleLogin() {}

  @UseGuards(GoogleAuthGuard)
  @Get('/oauth2/redirect/accounts.google.com')
  @Public()
  async googleLoginCallback(@Request() req, @Res() res) {
    if (!req.user) {
      // if login fail, clear session anyway
      await this.clearSession(req);
      res.redirect('/auth?loginFailed=true');
      return;
    }
    await req.session.save();
    res.redirect('/');
  }

  async clearSession(req) {
    req.logout(); // clear session payload
    req.session.destroy(); // delete sessionID row record from session db (not necessary?)
  }
}
