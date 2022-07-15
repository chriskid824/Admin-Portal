import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { ExampleController } from './example.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AuthController } from './auth/auth.controller';
import { UsersModule } from './users/users.module';
import { UsersController } from './users/user.controller';
import { CustomerModule } from './customer/customer.module';
import { ErpModule } from './erp/erp.module';
import { OrderModule } from './order/order.module';
import { ProductModule } from './product/product.module';
import { ShippingModule } from './shipping/shipping.module';
import ormconfig from './ormconfig';
import config from './config';

import navBarData from './navBarConfig';
import { APP_GUARD } from '@nestjs/core';
import { AuthenticatedGuard } from './auth/authenticated.guard';
import { ConsoleModule } from 'nestjs-console';
import { ConnectionOptions } from 'typeorm';
import { RolesGuard } from './auth/roles.guard';
import { UserRolesModule } from './user-role/user-role.module';
import { HttpModule } from '@nestjs/axios';
import { PubSubModule } from './pubsub/pubsub.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(ormconfig),
    TypeOrmModule.forRoot(config.db as ConnectionOptions),
    TypeOrmModule.forRoot(config.snkrdunkdb as ConnectionOptions),
    TypeOrmModule.forRoot(config.shopifydb as ConnectionOptions),
    AuthModule,
    UsersModule,
    ConsoleModule,
    CustomerModule,
    ErpModule,
    OrderModule,
    ProductModule,
    ShippingModule,
    UserRolesModule,
    HttpModule,
    PubSubModule,
  ],
  controllers: [
    AppController,
    ExampleController,
    AuthController,
    UsersController,
  ],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AuthenticatedGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res, next) => {
        if (config.isStaging) {
          // build info
          const buildTime = new Date(config.buildInfo.time);
          buildTime.setHours(buildTime.getUTCHours() + 8);
          res.locals.buildInfo = {
            time: buildTime,
            commit: config.buildInfo.commit.substr(0, 7),
          };
        }

        // nav bar data
        const items: {} = Object.assign({}, navBarData.items);
        Object.keys(items).find((key: string) => {
          const item: { path: string; title: string } = items[key];
          if (item.path === req.path || req.path.startsWith(item.path + '/')) {
            res.locals.title = item.title;
            items[key] = Object.assign({}, item, {
              active: true,
            });
            return true;
          }
        });
        res.locals.navBarData = items;
        next();
      })
      .forRoutes({ path: '*', method: RequestMethod.GET });
  }
}
