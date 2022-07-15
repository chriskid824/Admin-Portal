import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { GoogleStrategy } from './google.strategy';
import { SessionSerializer } from './session.serializer';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ session: true }),
  ],
  providers: [AuthService, GoogleStrategy, SessionSerializer],
  exports: [AuthService],
})
export class AuthModule {}
