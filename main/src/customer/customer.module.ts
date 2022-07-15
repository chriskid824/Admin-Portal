import { Module } from '@nestjs/common';
import { CommentModule } from 'src/comment/comment.module';
import { OrderModule } from 'src/order/order.module';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';

@Module({
  imports: [CommentModule, OrderModule],
  controllers: [CustomerController],
  providers: [CustomerService],
  exports: [CustomerService]
})
export class CustomerModule {}
