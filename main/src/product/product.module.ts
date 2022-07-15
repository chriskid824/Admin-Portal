import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { SnkrdunkProductService } from './snkrdunk.product.service';
import { ProductCmdService } from './cmd.service';
import { ProductController } from './product.controller';
import { CategoryService } from './category.service';
import { ImageService } from './image.service';
import { NexusApiService } from './nexusApi.service';
import { StockService } from './stock.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductExtended } from './productExtended.entity';
import { ShopifyProductService } from './shopify.product.service';
import { LegacyLogModule } from 'src/legacy-log/legacy-log.module';
import { PubSubService } from 'src/pubsub/pubsub.service';
import { DuProductService } from './duProduct.service';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([ProductExtended]),
    LegacyLogModule,
  ],
  controllers: [ProductController],
  providers: [
    ProductService,
    ProductCmdService,
    CategoryService,
    ImageService,
    NexusApiService,
    StockService,
    ShopifyProductService,
    PubSubService,
    DuProductService,
    SnkrdunkProductService,
  ],
  exports: [ProductService, CategoryService, ProductCmdService, StockService],
})
export class ProductModule {}
