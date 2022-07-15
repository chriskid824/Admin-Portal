import { Strategy } from 'passport-google-oidc';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { AuthService } from './auth.service';
import config from '../config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private authService: AuthService) {
    // If baseUrl is not provided, Google will redirect user to HTTP instead of HTTPS
    // Reference: https://www.passportjs.org/packages/passport-google-oidc/
    super({
      clientID: config.googleOAuth.clientId,
      clientSecret: config.googleOAuth.clientSecret,
      callbackURL: `${config.baseUrl}/auth/oauth2/redirect/accounts.google.com`,
      scope: ['profile', 'email'],
    });
  }

  async validate(token, tokenSecret, profile): Promise<any> {
    const emails = tokenSecret?.emails;
    if (!emails) {
      return null;
    }
    // Get one of the emails with kickscrew.com domain
    const email = emails.find((email) => {
      const emailValue: string = email?.value ?? '';
      return emailValue.endsWith('@kickscrew.com');
    }).value;
    if (!email) {
      console.log('GoogleOidcStrategy validate email not found.');
      return null;
    }
    console.log('GoogleOidcStrategy validate email: ', email);
    return this.authService.validateUser(email);
  }
}
