import { Module } from '@nestjs/common';
import { OrderModule } from 'src/order/order.module';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';
import { FedexService } from './fedex.service';
import { HttpModule } from '@nestjs/axios';
import { ProductModule } from 'src/product/product.module';
import { LocationService } from './location.service';

@Module({
  imports: [OrderModule, ProductModule, HttpModule],
  controllers: [ShippingController],
  providers: [ShippingService, LocationService, FedexService],
  exports: [ShippingService]
})
export class ShippingModule { }
