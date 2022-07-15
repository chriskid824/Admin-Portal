import { Module } from '@nestjs/common';
import { CommentModule } from 'src/comment/comment.module';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OrderExportService } from './orderExport.service';
import { ProductModule } from 'src/product/product.module';
import { ErpModule } from 'src/erp/erp.module';

@Module({
  imports: [CommentModule, ProductModule, ErpModule],
  controllers: [OrderController],
  providers: [OrderService, OrderExportService],
  exports: [OrderService]
})
export class OrderModule {}
