import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { UnauthorizedException } from '@nestjs/common';

const redirect_errs = [401];

// @Catch(UnauthorizedException)
@Catch(HttpException)
export class AuthFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    if (redirect_errs.includes(status)) {
      response.status(status).redirect('/auth');
    } else {
      response.status(status).json(exception.getResponse());
    }
  }
}
