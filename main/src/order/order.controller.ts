import {
  Controller,
  Get,
  Res,
  Param,
  Render,
  Query,
  Post,
  Body,
} from '@nestjs/common';
import { CommentService } from 'src/comment/comment.service';
import { WhereLike } from 'src/models/BaseService';
import { Order } from 'src/models/Order';
import { User } from 'src/users/user.decorator';
import { User as UserEntity } from 'src/users/user.entity';
import { OrderService } from './order.service';
import { OrderExportService } from './orderExport.service';
import orderFilterData from './orderFilterConfig';

// TODO: Refactor to follow Nest.js providers pattern
// https://docs.nestjs.com/providers
@Controller('order')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly exportService: OrderExportService,
    private readonly commentService: CommentService,
  ) {}

  @Post('api/comment')
  async createOrderComment(
    @User() userId: number,
    @Body('id') id: number,
    @Body('comment') body: string,
  ) {
    const exists: boolean = await this.orderService.exists(id);
    if (!exists) return {};
    const comment = await this.commentService.createForOrder(
      userId,
      body,
      id.toString(),
    );
    return { comment };
  }

  @Get('search')
  @Render('index')
  async search() {
    return {};
  }

  @Get('search/api/:query')
  async searchIds(@Param('query') query: string) {
    const { orders } = await this.orderService.findLike(
      ['ref_number', 'transition_id', 'order_id'],
      [query],
      WhereLike.Contains,
      1,
      5,
    );
    return {
      orders: orders.map((o: Order) => ({
        id: o.id,
        ref: o.refNumber,
        name: o.customerName,
        email: o.customerEmail,
        amount: o.amount,
        currency: o.currency,
        status: o.status,
      })),
    };
  }

  @Get('search/:search')
  @Render('orders')
  async listSearchIds(
    @Param('search') search: string,
    @Query('page') page: number,
  ) {
    page = !page || isNaN(page) ? 1 : page;
    const { count, orders } = await this.orderService.findLike(
      ['ref_number', 'transition_id', 'order_id'],
      [search],
      WhereLike.Contains,
      page,
      50,
      'order_date',
    );
    const nextPage = +page + 1;
    const previousPage = page - 1;
    return {
      title: 'Search Orders',
      count,
      orderFilterData: orderFilterData.orderFilterData,
      searchQuery: search,
      orders,
      page,
      nextPage,
      previousPage,
      currentPath: '/search/' + search,
      token: page > 1,
    };
  }

  @Get('export')
  async export(@Query() query) {
    console.log('Export controller!');
    const page = 1;
    //Reget orders with no paging
    const { orders } = await this.orderService.findByUrlQuery(query, page);
    return await this.exportService.JSONToExcelConvertor(
      orders,
      query['exportExcel'],
    );
  }

  @Get('exportLabels')
  @Render('orderLabels')
  async exportLabels(
    @Query('labelType') labelType: string,
    @Query('orderIds') orderIds: string,
  ) {
    if (!orderIds) return { orders: [], labelType };
    let { orders } = await this.orderService.findByUrlQuery(
      { order_id: orderIds },
      1,
      orderIds.split(',').length,
    );
    orders = await this.exportService.formatOrderForShippingLabel(
      orders,
      labelType,
    );

    return { orders, labelType };
  }

  @Get()
  @Render('orders')
  async list(@Query() query) {
    const page = query['page'] === undefined ? 1 : query['page'];
    const searchToken = query['search'] == 1;
    delete query['page'];
    const queryString = new URLSearchParams(query).toString();
    //Perform search if query have "search" field = 1
    let count, orders;
    if (searchToken) {
      ({ count, orders } = await this.orderService.findByUrlQuery(query, page));
    } else {
      // Show 'Success' and 'Wrong Price' order in last 3 months
      ({ count, orders } = await this.orderService.findSuccessAndWrongPrice(
        page,
      ));
    }

    const nextPage = +page + +1;
    const previousPage = page - 1;

    return {
      title: searchToken ? 'Search Orders' : 'Orders',
      count,
      orders,
      page,
      orderFilterData: orderFilterData.orderFilterData,
      nextPage,
      queryObject: query,
      filterQuery: searchToken ? queryString : null,
      previousPage,
      token: page > 1,
    };
  }

  @Get('/view/:id')
  @Render('order')
  async view(@Param('id') id: string, @User() user: UserEntity) {
    console.log('Viewing order: ', id);
    const order = await this.orderService.findById(id);
    const validCustomer = order.data['member_id'] > 0;
    const comments = await this.commentService.findByOrderId(
      order.id.toString(),
    );
    return {
      order,
      validCustomer,
      id,
      comments,
      user,
      orderFilterData: orderFilterData.orderFilterData,
    };
  }

  @Get('/ERP/updateERP')
  async updateErp() {
    const data = await this.orderService.pullErpStatus();
    return { success: true, data };
  }

  @Get('/edit/:id')
  @Render('orderEdit')
  async editForm(@Param('id') id, @User() user) {
    const order = await this.orderService.findById(id);
    const validCustomer = order.data['member_id'] > 0;
    const editableDataSource = {};
    editableDataSource['status'] = await this.orderService.getOrderStatusList();
    console.log(order.data['country']);
    return { order, validCustomer, id, user, editableDataSource };
  }

  @Post('/edit/:id')
  async edit(@Param('id') refNumber, @Body() body, @Res() res) {
    body['address'] = `${body.address1}, ${body.address2}<br/>${body.city}, ${body.state}, ${body.zip}<br/>${body.country}`;
    body['country_code'] = await this.orderService.getCountryCode(body['country']);
    await this.orderService.updateOrderByRefNumber(refNumber, body);
    return res.redirect('/order/view/' + refNumber);
  }
}
