import { Body, Controller, Get, Param, Post, Query, Render } from '@nestjs/common';
import { CommentService } from 'src/comment/comment.service';
import { OrderService } from 'src/order/order.service';
import { User } from 'src/users/user.decorator';
import { User as UserEntity } from 'src/users/user.entity';
import { CustomerService } from './customer.service';

@Controller('customer')
export class CustomerController {
  constructor(
    private readonly customerService: CustomerService,
    private readonly orderService: OrderService,
    private readonly commentService: CommentService
  ) {}

  @Post('api/comment')
  async addComment(
    @User('id') userId: number,
    @Body('id') id: number, 
    @Body('comment') body: string
  ) {
    const exists: boolean = await this.customerService.exists(id);
    if (!exists) return {};
    const comment = await this.commentService.createForCustomer(userId, body, id.toString());
    return { comment };
  }

  @Get()
  @Render('customers')
  async list(@Query('page') page: number) {
    page = page ?? 1;
    const customers = await this.customerService.findAll(page);
    return {
      title: 'Customers',
      customers, page, 
      nextPage: +page + 1, 
      previousPage: page - 1
    };
  }

  @Get('/:id')
  @Render('customer')
  async view(@Param('id') id: number, @User() user: UserEntity) {
    const customer = await this.customerService.findById(id);
    const orders = await this.orderService.findOrdersByCustomer(id);
    const comments = await this.commentService.findByCustomerId(id.toString());
    return { customer, id, orders, comments, user };
  }
}
