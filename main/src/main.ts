require('dotenv').config();

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import config from './config';
import * as session from 'express-session';
import * as passport from 'passport';
import * as hbs from 'hbs';
import { AuthFilter } from './auth/auth-exception.filter';
import { TypeormStore } from 'connect-typeorm';
import { getConnection } from 'typeorm';
import { SessionEntity } from './auth/session.entity';
import { ValidationPipe } from '@nestjs/common';

const port = process.env.PORT || 3000;

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
  }));
  app.useStaticAssets(join(__dirname, '..', 'public'));
  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  hbs.registerPartials(join(__dirname, '..', 'views', 'partials'));
  app.setViewEngine('hbs');

  // Turn a timestap into string in format: YYYY-MM-DD HH:MM:SS
  hbs.registerHelper("prettifyDate", function (timestamp) {
    let d = new Date(timestamp);
    const formattedStr = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}, ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
    return formattedStr;
  });

  // Operators
  hbs.registerHelper("seq", function (param1, param2) { // strict equal
    return param1 === param2;
  });
  hbs.registerHelper("eq", function (param1, param2) {
    return param1 == param2;
  });
  hbs.registerHelper("ne", function (param1, param2) {
    return param1 != param2;
  });
  hbs.registerHelper("gt", function (param1, param2) {
    return param1 > param2;
  });
  hbs.registerHelper("ge", function (param1, param2) {
    return param1 >= param2;
  });
  hbs.registerHelper("lt", function (param1, param2) {
    return param1 < param2;
  });
  hbs.registerHelper("le", function (param1, param2) {
    return param1 <= param2;
  });


  app.useGlobalFilters(new AuthFilter());

  const sessionRepository = getConnection().getRepository(SessionEntity);

  app.use(
    session({
      secret: config.auth.session_secret,
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
      store: new TypeormStore().connect(sessionRepository),
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());

  await app.listen(port);
}
bootstrap();
