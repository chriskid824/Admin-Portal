import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { RawData } from 'src/models/BaseModel';
import { BaseService, WhereLike } from 'src/models/BaseService';
import { Brackets, Connection, SelectQueryBuilder } from 'typeorm';
import { Order } from '../models/Order';
import { ProductService } from 'src/product/product.service';
import { StockService } from 'src/product/stock.service';
import { CategoryService, CategoryType } from 'src/product/category.service';
import orderFilterData from './orderFilterConfig';
import { formatDate } from 'src/utils';
import { ErpService } from 'src/erp/erp.service';
import { SdoDbService } from 'src/erp/sdoDb.service';
import erpConfig from 'src/erp/erpConfig';
// eslint-disable-next-line @typescript-eslint/no-var-requires

@Injectable()
export class OrderService extends BaseService {
  constructor(
    @InjectConnection('backend') protected readonly connection: Connection,
    private productService: ProductService,
    private stockService: StockService,
    private categoryService: CategoryService,
    private erpService: ErpService,
    private sdoDbService: SdoDbService,
  ) {
    super(connection);
  }

  protected tableName = 'sys_transition';
  protected tableAlias = 'o';

  private appendERPWarehouseQuery(
    queryBuilder: SelectQueryBuilder<any>,
  ): SelectQueryBuilder<any> {
    return queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where(
          new Brackets((qbOr) => {
            qbOr
              .where('warehouse like :wh1', { wh1: 'KC-Shop%' })
              .orWhere('warehouse like :wh2', { wh2: 'KCSHOP次品仓%' })
              .orWhere('warehouse like :wh3', { wh3: 'Kutu系统上海仓' });
          }),
        )
          .orWhere('warehouse like :wh4', { wh4: 'Office%' })
          .orWhere('warehouse like :wh5', { wh5: 'NoBox-Off%' })
          .orWhere('warehouse like :wh6', { wh6: 'FR%' })
          .orWhere('warehouse like :wh7', { wh7: 'Dunk%' })
          .orWhere('warehouse like :wh8', { wh8: '%拼多多海外%' })
          .orWhere('warehouse like :wh9', { wh9: '%京东国际%' })
          .orWhere('warehouse like :wh10', { wh10: '%天猫国际%' })
          .orWhere('warehouse like :wh11', { wh11: '%香港C仓库%' })
          .orWhere('warehouse like :wh12', { wh12: '%海外零售%' })
          .orWhere('warehouse like :wh13', { wh13: '%退货仓(HK)%' });
      }),
    );
  }
  // Get ERP status (Migrate from transition.php)
  async getERPStatus(order: Order): Promise<string> {
    let ERPstatus = '';
    const ERPcolumns = ['addressdate addressdate', 'shippeddate shippeddate'];

    const ERP = await this.fetchRawUnion(
      [
        this.appendERPWarehouseQuery(
          this.getQueryBuilder()
            .select(ERPcolumns)
            .from('sys_sdo_web', 'web')
            .where('tid = :tid', { tid: order.data['transition_id'] })
            .andWhere('deleted = 0'),
        ),
        this.appendERPWarehouseQuery(
          this.getQueryBuilder()
            .select(ERPcolumns)
            .from('sys_sdo_other', 'other')
            .where(
              new Brackets((qb) => {
                qb.where('tid = :tid', { tid: order.data['transition_id'] })
                  .orWhere('so = :erpid', { erpid: order.data['erpid'] })
                  .andWhere("so <> ''");
              }),
            )
            .andWhere('deleted = 0'),
        ),
      ],
      1,
      1,
      'shippeddate',
      'DESC',
    );

    const sumqty = await this.appendERPWarehouseQuery(
      this.getQueryBuilder()
        .select('SUM(qty)', 'sum')
        .from('sys_sdo_web', 'sum')
        .where('tid = :tid', { tid: order.data['transition_id'] })
        .andWhere('deleted = 0'),
    )
      .groupBy('tid')
      .getRawOne();

    const cancel_status = await this.getQueryBuilder()
      .select('cancelStatus')
      .from('kc_transition', 'cancel')
      .where('erpSo = :erpid', { erpid: order.data['erpid'] })
      .andWhere('erpSo <> ""')
      .orderBy('updateDate', 'DESC')
      .getRawOne();

    const totalqty = sumqty ? sumqty['sum'] : 0;
    let addressdate = 0,
      shippeddate = 0;

    if (ERP[0]) {
      addressdate = ERP[0]['addressdate'];
      shippeddate = ERP[0]['shippeddate'];
    }

    if (cancel_status) {
      switch (cancel_status['cancelStatus']) {
        case 0:
          break;
        case 1:
          return 'Cancel';
        case 2:
          return 'Refunded';
        case 3:
          return 'Refunding';
      }
    }

    if (addressdate < shippeddate && order.data['totalqty'] == totalqty) {
      ERPstatus = '全部發貨';
    } else if (addressdate < shippeddate) {
      ERPstatus = '部份發貨';
    } else if (
      order.data['totalqty'] == totalqty &&
      addressdate > shippeddate
    ) {
      ERPstatus = '全部配貨';
    } else if (addressdate > shippeddate && order.data['totalqty'] > totalqty) {
      ERPstatus = '部份配貨';
    } else if (order.data['totalqty'] < totalqty) {
      ERPstatus = '多個SDO';
    } else if (order.data['fromsite'] >= 70) {
      ERPstatus = '未配貨';
    } else if (order.data['erpid'] != '' && order.data['fromsite'] < 70) {
      ERPstatus = '已入單';
    } else if (order.data['erpid'] == '' && order.data['fromsite'] < 70) {
      ERPstatus = '未入單';
    }
    if (order.data['erpid'] != '') {
      const updatetime =
        Math.floor(new Date().getTime() / 1000) -
        order.data['status_update_date'];
      if (updatetime >= 86400) {
        ERPstatus =
          ERPstatus + '\n' + Math.round(updatetime / 86400) + ' Day(s)';
      } else if (updatetime >= 3600) {
        ERPstatus =
          ERPstatus + '\n' + Math.round(updatetime / 3600) + ' Hour(s)';
      } else {
        ERPstatus = ERPstatus + '\n' + Math.round(updatetime / 60) + ' Min(s)';
      }
    }
    return ERPstatus;
  }

  // fedexAPI > ShipWebServiceClient.php > get_dtbt_warehouse
  async getERPWarehouse(id: number): Promise<any> {
    const sdoTable = 'sys_sdo_web';
    const sdoAlias = 'w';
    const warehouseTable = 'erp_warehouse';
    const warehouseAlias = 'e';
    const columns = [
      `${sdoAlias}.tid`,
      `${sdoAlias}.warehouse`,
      `${warehouseAlias}.code`,
      `${warehouseAlias}.name`,
      `${warehouseAlias}.used_name`,
    ];
    const query = this.getQueryBuilder()
      .select(columns)
      .from(sdoTable, sdoAlias)
      .leftJoin(
        warehouseTable,
        warehouseAlias,
        `${sdoAlias}.warehouse = ${warehouseAlias}.name
        OR ${sdoAlias}.warehouse = ${warehouseAlias}.used_name`
      )
      .where(`${sdoAlias}.deleted = 0`)
      .andWhere(`${sdoAlias}.tid = :id`, { id })
    const result = await query.getRawOne();
    return result;
  }

  // Get paymentstatus (Migrate from transition.php)
  getPaymentStatus(order: Order): Promise<string> {
    let status, payv3d, tmp00;

    if (order.data['delivery_charge'] == 0) {
      status = 'Free';
    }
    if (order.data['paid'] > 0) {
      status = 'Paid';
    }
    if (order.data['payv_3d'] !== '') {
      payv3d = '3D: ' + order.data['payv_3d'] + ' - ';
    } else {
      payv3d = '';
    }
    if (
      order.data['paypal_return_status'] == 'Completed' ||
      order.data['paypal_return_status'] == 'Success'
    ) {
      status = 'Paypal (' + order.data['paypal_return_status'] + ')';
    } else if (order.data['paypal_return_status'] !== '') {
      if (
        order.data['ref_number'].match('/TB/') &&
        order.data['contact_email'] != ''
      ) {
        status = order.data['contact_email'];
      }
      if (
        order.data['order_id'] &&
        (order.data['order_id'].substr(0, 2) == 'm_' ||
          order.data['ref_number_prefix'] == 'KS')
      ) {
        tmp00 = order.data['paypal_return_status'].split(':::');
        if (tmp00.length >= 2) {
          if (tmp00[1] == 'FULFILLED|PAID') {
            status =
              tmp00[0].replace('pdcptb', 'Paydollar') +
              '' +
              order.data['paypal_id'] +
              '\n\n' +
              tmp00[1];
          } else {
            status =
              tmp00[0].replace('pdcptb', 'Paydollar') +
              '' +
              order.data['paypal_id'] +
              '\n\n' +
              tmp00[1].replace('/PAID/', 'PAID', tmp00[1]);
          }
        } else {
          status =
            order.data['paypal_id'] +
            '\n\n' +
            order.data['paypal_return_status'];
        }
      } else {
        status = 'Paypal ' + order.data['paypal_return_status'];
      }
    } else if (
      order.data['avsresult'] &&
      order.data['avsresult'].match('/5/')
    ) {
      status =
        'Payvision ' +
        payv3d +
        ' (' +
        order.data['avsresult'].substr(0, 2) +
        ')';
    } else if (order.data['payvision_transation_id'] > 0) {
      status = 'Payvision ' + payv3d + ' (Non)';
    } else if (
      order.data['alipay_status'] &&
      (order.data['alipay_status'].match('/REFUND/') ||
        order.data['alipay_status'].match('/WAIT_SELLER_AGREE/'))
    ) {
      status = 'Alipay (' + order.data['alipay_status'] + ')';
    } else if (
      order.data['alipay_status'] &&
      order.data['alipay_status'].match('/FINISHED/')
    ) {
      status = 'Alipay (' + order.data['alipay_status'] + ')';
    } else if (order.data['alipay_status'] != '') {
      status = 'Alipay (' + order.data['alipay_status'] + ')';
    } else if (order.data['free_checkout'] > 0) {
      status = 'Free Checkout';
    } else if (
      order.data['ref_number'].substr(0, 2) == 'IO' ||
      order.data['ref_number'].substr(0, 2) == 'KC'
    ) {
      status = order.data['paypalex_token'] + '' + order.data['paypal_id'];
    }

    return status;
  }

  // async getPaymentGatewayOptions(): Promise<string[]> {
  //   return await this.getQueryBuilder()
  //     .select('DISTINCT `paypalex_token`','paymentopt')
  //     .from('sys_transition', 'paymentopt')
  //     .where('transition_id >= :tid', { tid: 2475500 })
  //     .andWhere('paypalex_token <> ""').getRawMany();
  // }

  // async getStatusOptions(): Promise<string[]> {
  //   return await this.getQueryBuilder()
  //     .select('name','name')
  //     .from('sys_category', 'name')
  //     .where('parent = 601')
  //     .andWhere('deleted = 0')
  //     .orWhere('`name`="Can-Ship"').
  //     getRawMany();
  // }

  async findOrderCountByCustomer(orderEmail: string, fromsite: number) {
    const fields = ['transition_id, status'];
    const orders = await this.select(fields)
      .where('paypal_email = :email', { email: orderEmail })
      .andWhere('fromsite = :fromsite', { fromsite: fromsite })
      .getRawMany();
    const order_count: number = orders.length;
    let refund_count = 0,
      blacklist_count = 0;

    orders.forEach((order) => {
      switch (order.status) {
        case 'Returned':
          refund_count++;
          break;
        case 'Blacklist':
          blacklist_count++;
          break;
      }
    });

    const refund_rate = Math.round(
      ((refund_count + blacklist_count) / order_count) * 100,
    );

    return { order_count, refund_rate, blacklist_count };
  }

  parseDateString(date_second) {
    let date_string = '';
    if (date_second > 0) {
      const date = new Date(date_second * 1000);
      date_string = date.toLocaleString();
    }
    return date_string;
  }

  async getStatusLabel(order){
    let status = '';
    const orderFilterDatastatus = orderFilterData.orderFilterData.status;
    orderFilterDatastatus.forEach((element) => {
      if (element.value == order.status) {
        status = element.displayText;
      }
    });
    return status;
  }

  async getSelfRemarks(id: number): Promise<string[]> {
    const remarks = await this.getQueryBuilder()
      .select()
      .from('sys_transition_rm', '')
      .where('tid = :id', { id })
      .getRawMany();

    const remarkArray = Promise.all(
      remarks.map(async (remark) => {
        remark['updatedate'] = this.parseDateString(remark.updatedate);
        if (remark.userid > 0) {
          const user_name = await this.getQueryBuilder()
            .select('name')
            .from('sys_user', '')
            .where('id = :userid', { userid: remark.userid })
            .getRawOne();
          if (user_name) {
            remark['user_name'] = user_name.name;
          }
        }
        if (remark.oldstatus > 0) {
          const old_status = await this.getQueryBuilder()
            .select('name')
            .from('sys_category', '')
            .where('id = :status', { status: remark.oldstatus })
            .getRawOne();

          remark['old_status'] = old_status.name;
        }
        if (remark.newstatus > 0) {
          const new_status = await this.getQueryBuilder()
            .select('name')
            .from('sys_category', '')
            .where('id = :status', { status: remark.newstatus })
            .getRawOne();

          remark['new_status'] = new_status.name;
        }
        return remark;
      }),
    );
    return remarkArray;
  }

  async getCountryCode(country){
    const queryres = await this.fetchRawPaginated(
      this.getQueryBuilder()
        .select('countries_iso_code_2')
        .from('countries', '')
        .where(`countries_name="${country}"`),
    );
    return queryres.length ? queryres[0]['countries_iso_code_2'] : '';
  }

  async findAll(
    page: number,
    numPerPage = 50,
    orderBy = 'order_date',
    orderDir: 'ASC' | 'DESC' = 'DESC',
  ): Promise<Order[]> {
    const orders: RawData[] = await this.fetchRawPaginated(
      this.select(),
      page,
      numPerPage,
      orderBy,
      orderDir,
    );
    return await Promise.all(
      orders.map(async (o) => {
        const order: Order = Order.rawToObject(o);
        order.data['erp_status'] = await this.getERPStatus(order);
        order.data['paymentstatus'] = this.getPaymentStatus(order);
        order.data['status_label'] = await this.getStatusLabel(order);
        return order;
      }),
    );
  }

  async findSuccessAndWrongPrice(
    page: number,
    numPerPage = 50,
    orderBy = 'order_date',
    orderDir: 'ASC' | 'DESC' = 'DESC',
  ) {
    const query = this.select()
      .where(`udt >= now()-interval 3 month`)
      .andWhere(`status in ('Success','Wrong Price')`);
    const orders: RawData[] = await this.fetchRawPaginated(
      //only get last 3 months record and status in ('Success','Wrong Price')
      query,
      page,
      numPerPage,
      orderBy,
      orderDir,
    );
    const count = await this.getTotalCount(query);
    return {
      count,
      orders: await Promise.all(
        orders.map(async (o) => {
          const order: Order = Order.rawToObject(o);
          order.data['erp_status'] = await this.getERPStatus(order);
          order.data['paymentstatus'] = this.getPaymentStatus(order);
          order.data['status_label'] = this.getStatusLabel(order);
          return order;
        }),
      ),
    };
  }

  async findByOrderId(orderId: string) {
    const raw: RawData = await this.select()
      .where('transition_id = :orderId', { orderId })
      .getRawOne();
    const order: Order = Order.rawToObject(raw);
    return order;
  }

  async findById(id: string): Promise<Order> {
    const o: RawData = await this.select()
      .where('ref_number = :id', { id })
      .getRawOne();
    const order: Order = Order.rawToObject(o);
    //TODO: Put these in a function/method/service/whatever
    order.data['erp_status'] = await this.getERPStatus(order);
    order.data['event_log'] = await this.getSelfRemarks(
      order.data['transition_id'],
    );

    order.data['paymentstatus'] = this.getPaymentStatus(order);

    const sku = order.data['custom_code'].split(':')[0];
    const tempSize = await this.stockService.getSizeIDBySku(sku);
    const sizeID = tempSize ? tempSize.size_id : null;
    const size = sizeID ? await this.productService.getSizeById(sizeID) : null;
    order.data['size'] = size ? size.name : '';

    if (order.data['member_id'] > 0) {
      const orderCount = await this.findOrderCountByCustomer(
        order.data['paypal_email'],
        order.data['fromsite'],
      );
      order.data['order_count'] = orderCount['order_count'];
      order.data['refund_rate'] = orderCount['refund_rate'];
      order.data['blacklist_count'] = orderCount['blacklist_count'];
    }
    order.data['status_label'] = await this.getStatusLabel(order);
    return order;
  }

  async findByIdLike(
    query: string,
    like?: WhereLike,
    page?: number,
    numPerPage?: number,
    orderBy?: string,
    orderDir?: 'ASC' | 'DESC',
  ) {
    const { orders } = await this.findLike(
      ['transition_id'],
      [query],
      like,
      page,
      numPerPage,
      orderBy,
      orderDir,
    );
    return orders;
  }

  async findByRefLike(
    query: string,
    like?: WhereLike,
    page?: number,
    numPerPage?: number,
    orderBy?: string,
    orderDir?: 'ASC' | 'DESC',
  ) {
    const { orders } = await this.findLike(
      ['ref_number'],
      [query],
      like,
      page,
      numPerPage,
      orderBy,
      orderDir,
    );
    return orders;
  }

  async findLike(
    columns: string[],
    queries: string[],
    like: WhereLike = WhereLike.Contains,
    page = 1,
    numPerPage = 50,
    orderBy: string = null,
    orderDir: 'ASC' | 'DESC' = 'ASC',
  ) {
    let likeValue;
    const select = this.select();
    columns.forEach((c, idx) => {
      likeValue = queries[idx]
        ? this.getLikeValue(queries[idx], like)
        : likeValue;
      select.orWhere(`${c} like :${c}`, { [c]: likeValue });
    });
    const count = await this.getTotalCount(select);
    const rows: RawData[] = await this.fetchRawPaginated(
      select,
      page,
      numPerPage,
      orderBy,
      orderDir,
    );
    return {
      count,
      orders: await Promise.all(
        rows.map(async (o) => {
          const order: Order = Order.rawToObject(o);
          order.data['erp_status'] = await this.getERPStatus(order);
          order.data['paymentstatus'] = this.getPaymentStatus(order);
          return order;
        }),
      ),
    };
  }

  async findAddressDate(startTime, endTime) {
    const columns = [`transition_id`, `udt`];
    const data = await this.getQueryBuilder()
      .select(columns)
      .from(`sys_transition_status_history`, `status_history`)
      .where(`new_status = 'address'`)
      .andWhere('udt between :start and :end', {
        start: startTime,
        end: endTime,
      })
      .getRawMany();
    return data;
  }

  async findByUrlQuery(
    query,
    page: number,
    numPerPage = 50,
    orderBy = 'order_date',
    orderDir: 'ASC' | 'DESC' = 'DESC',
  ) {
    const sortBy = query['sortBy'] ? query['sortBy'] : orderBy;
    // Loop through the query object and build the query
    let selectQuery = this.select();
    for (let field of Object.keys(query)) {
      let value = query[field];
      let cond;
      const condOpt = {};
      if (field && value) {
        switch (field) {
          //Do nothing for these fields
          case 'page':
          case 'search':
          case 'amountopt':
          case 'totalqtyopt':
          case 'order_date_end':
          case 'shipping_date_end':
          case 'udt_end':
          case 'address_date_end':
            break;

          case 'erpstatus':
            let operator = '<'; // For case 2 & 3
            let inToken = 'not in'; // For case 5 & 6
            switch (value) {
              case '0':
                cond = `erpid = \'\'`;
                break;
              case '1':
                cond = `erpid != \'\'`;
                break;

              case '2':
                operator = '>';
              case '3':
                selectQuery = selectQuery.andWhere(
                  (qb) =>
                    'transition_id IN ' +
                    qb
                      .subQuery()
                      .select(['tid'])
                      .from('sys_sdo_web', 'ssw')
                      .where('deleted = 0')
                      .andWhere('addressdate ' + operator + ' shippeddate')
                      .groupBy('sdo')
                      .getQuery(),
                );
                break;

              case '4':
                selectQuery = selectQuery.andWhere(
                  (qb) =>
                    'transition_id IN ' +
                    qb
                      .subQuery()
                      .select(['tid'])
                      .from('sys_sdo_web', 'ssw')
                      .where('deleted = 0')
                      .groupBy('tid')
                      .andHaving('count(tid) > 1')
                      .andWhere("erpid != ''")
                      .getQuery(),
                );
                break;

              case '5':
                inToken = 'in';
              case '6':
                selectQuery = selectQuery.andWhere("o.erpid <> ''").andWhere(
                  (qb) =>
                    'o.`erpid` COLLATE utf8_general_ci IN ' +
                    qb
                      .subQuery()
                      .select(['`erpSo`'])
                      .from('kc_transition', 'kc')
                      .where('(kc.`erpSo`=o.`erpid` COLLATE utf8_general_ci)')
                      .andWhere('`cancelStatus` ' + inToken + ' (1,2,3)')
                      .getQuery(),
                );
                break;
            }
            break;
          // Like clause
          case 'address':
          case 'contact_email':
          case 'country':
          case 'contactperson':
          case 'contactnumber':
          case 'custom_code':
          case 'paypal_id':
          case 'paypal_return_status':
            cond = `${field} like :${field}`;
            condOpt[field] = `${value}%`;
            break;

          case 'transition_id':
          case 'ref_number':
          case 'order_id':
          case 'paypal_id':
          case 'track_num':
            if (value.indexOf(',') > -1) {
              const values = value.split(',');
              cond = `${field} in (:${field})`;
              condOpt[field] = values;
              // Assuming user will copy a bunch of order, so no need to search with like function
              //REGEXP IS SLOW AF (Search via 'like '%value%' ')
              // cond = `${field} REGEXP :${field}`;
              // condOpt[field] = `${value.split(',').filter((v) => !!(v.trim())).join('|')}`;
              break;
            } else {
              cond = `${field} like :${field}`;
              condOpt[field] = `${value}%`;
              break;
            }

          case 'amount':
          case 'totalqty':
            cond = `${field} ${query[field + 'opt']} :${field}`;
            condOpt[field] = +value;
            break;

          // Shipping_date in format of string (YYYY/MM/DD)
          case 'shipping_date':
            selectQuery = selectQuery.andWhere("status = 'Shipped'");
            value = value.replace(/-/g, '/');
            query['shipping_date_end'] = query['shipping_date_end'].replace(
              /-/g,
              '/',
            );
          case 'order_date':
          case 'udt':
            cond = `${field} BETWEEN :${field}from AND :${field}to`;
            condOpt[field + 'from'] = value;
            condOpt[field + 'to'] = query[field + '_end'];
            break;

          case 'sortBy':
            if (value == 'shipping_date') {
              selectQuery = selectQuery.andWhere("status = 'Shipped'");
            }
            break;

          case 'exportExcel':
            numPerPage = 1000;
            switch (value) {
              case 'easyship':
              case 'ecship':
                selectQuery = selectQuery.andWhere("status != 'Ordering'");
                break;
            }
            break;
          
          case 'address_date':
            const data = await this.findAddressDate(
              value,
              query[`${field}_end`],
            );
            // Check if have order between dates.
            if (data.length != 0) {
              const idList = data.map((history) => history.transition_id);
              selectQuery = selectQuery.andWhere(
                `transition_id in (${idList.join(',')})`,
              );
            } else {
              //if no order, shouldn't return any order.
              selectQuery = selectQuery.andWhere('1 = 0');
            }
            break;

          case 'status':
            // special handling for status groups
            if (this.appendStatusGroupQuery(selectQuery, value)) {
              break;
            }
            // fall into default if no special handling for selected status value
          
          default:
            cond = `${field} = :${field}`;
            condOpt[field] = value;
            break;
        }
        if (cond && condOpt) selectQuery = selectQuery.andWhere(cond, condOpt);
      }
    }
    const count = await this.getTotalCount(selectQuery);
    //const count = await this.getTotalCount(selectQuery);
    const orders: RawData[] = await this.fetchRawPaginated(
      selectQuery,
      page,
      numPerPage,
      sortBy,
      orderDir,
    );

    return {
      count,
      orders: await Promise.all(
        orders.map(async (o) => {
          const order: Order = Order.rawToObject(o);
          order.data['erp_status'] = await this.getERPStatus(order);
          order.data['paymentstatus'] = this.getPaymentStatus(order);
          order.data['status_label'] = await this.getStatusLabel(order);
          return order;
        }),
      ),
    };
  }

  async findOrdersByCustomer(
    id: number,
    page = 1,
    numPerPage = 50,
    orderBy = 'order_date',
    orderDir: 'ASC' | 'DESC' = 'DESC',
  ): Promise<Order[]> {
    const rows: RawData[] = await this.fetchRawPaginated(
      this.select().where('member_id = :id', { id }),
      page,
      numPerPage,
      orderBy,
      orderDir,
    );
    return rows.map((r) => Order.rawToObject(r));
  }

  async exists(id: number): Promise<boolean> {
    const o = await this.select(['transition_id'])
      .where('transition_id = :id', { id })
      .getRawOne();
    return !!o;
  }

  private appendStatusGroupQuery(
    queryBuilder: SelectQueryBuilder<any>,
    status: string,
  ): boolean {
    status = status.toUpperCase();
    switch (status) {
      case 'CAN-SHIP':
        queryBuilder.andWhere(
          (qb) =>
            'o.`status` COLLATE utf8_general_ci IN ' +
            qb
              .subQuery()
              .select(['`name`'])
              .from('sys_category', 'category')
              .where(
                '`parent` = :orderStatusCatId',
                { orderStatusCatId: CategoryType.ORDER_STATUS },
              )
              .andWhere('`kf_cat_id` = 10')
              .andWhere('`deleted` = 0')
              .getQuery(),
        );
        return true;
    }
    return false;
  }

  async getStatusByGroup(status: string): Promise<string[]> {
    status = status.toUpperCase();
    switch (status) {
      case 'CAN-SHIP':
        const result = await this.getQueryBuilder()
          .select(['`name`'])
          .from('sys_category', 'category')
          .where(
            '`parent` = :orderStatusCatId',
            { orderStatusCatId: CategoryType.ORDER_STATUS },
          )
          .andWhere('`kf_cat_id` = 10')
          .andWhere('`deleted` = 0')
          .getRawMany();
        return result.map(({ name }) => name);
    }
    return [];
  }

  async getErpShops(): Promise<any[]> {
    const erpShops = this.getQueryBuilder()
      .select(['code', 'refCode'])
      .from('erp_shop', 'erpS')
      .where('sort > 0')
      .getRawMany();
    return erpShops;
  }

  async getTidByErpidAndRefNumber(erpId: string, refNumber: string) {
    return this.select(['transition_id'])
      .where('erpid = :erpId', { erpId })
      .orWhere('ref_number = :refNumber', { refNumber })
      .getRawOne();
  }

  async getTidByErpidAndOrderId(erpId: string, orderId: string) {
    return this.select(['transition_id'])
      .where('erpid = :erpId', { erpId })
      .orWhere('order_id = :orderId', { orderId })
      .getRawOne();
  }

  async requestErpSdo(
    pageSize: number,
    pageNum: number,
    startDate: Date,
    additionalParams: any = {}
  ) {
    const hktOffsetMS = 8 * 60 * 60 * 1000;
    const startDateStr = formatDate(
      startDate,
      'yyyy-MM-dd HH:mm:ss',
      hktOffsetMS,
    );
    return this.erpService.fetchDeliveries(
      pageSize,
      pageNum,
      startDateStr,
      additionalParams,
    );
  }

  async updateErpStatusToDb(delivery) {
    const shop = delivery['shop_code'];
    const platformCode = delivery['platform_code'];

    const {
      idField,
      fromsite = -99,
      table = 'sys_sdo_other'
    } = erpConfig.sdo.db[shop] || {};

    const details = delivery['details'];
    const statusInfo = delivery['delivery_statusInfo'];
    
    const sdo = delivery['code'];
    const tracking = delivery['express_no'] || '';
    const logistic = delivery['express_code'];
    const addressdate = Date.parse(delivery['create_date']) / 1000;
    let shippeddate = 0;
    //Delivery_statusInfo['delvery']==2 represent it have address and delivery_date.
    if (statusInfo['delivery'] == 2) {
      shippeddate = Date.parse(statusInfo['delivery_date']) / 1000;
    }
    let deleted;
    if (statusInfo['cancel'] || delivery['cancel'] !== 0) {
      deleted = 1;
    } else {
      deleted = 0;
    }

    const existingSdo = await this.sdoDbService.findBySdo(sdo, table);
    if (!existingSdo) {
      const baseSdoRecord = {
        tid: 0,
        tbid: '',
        tbname: delivery['vip_name'],
        sdo,
        tracking,
        logistic,
        addressdate,
        shippeddate,
        warehouse: delivery['warehouse_name'],
        sold_price: delivery['amount'],
        shop,
        fromsite,
        createdate: () => 'UNIX_TIMESTAMP(CURRENT_TIMESTAMP)',
        updatedate: () => 'UNIX_TIMESTAMP(CURRENT_TIMESTAMP)',
        deleted,
      };
      if (idField) {
        baseSdoRecord[idField] = platformCode;
      }

      const buildInsertBody = details.map(async (item) => {
        const tradeCode = item['trade_code'];
        const newSdoRecord = Object.assign({}, baseSdoRecord, {
          item: item['sku_code'],
          qty: item['qty'],
          retail_price: 0,
          get_price: item['price'],
          so: tradeCode,
        });

        if (shop === 'Shopify') {
          const order = await this.getTidByErpidAndRefNumber(tradeCode, platformCode);
          if (order) {
            newSdoRecord['tid'] = order['transition_id'];
          } else {
            newSdoRecord['tid'] = 0;
          }
        } else if (shop === 'GOAT' || shop === 'GOATCN') {
          const order = await this.getTidByErpidAndOrderId(tradeCode, platformCode);
          if (order) {
            newSdoRecord['tid'] = order['transition_id'];
          } else {
            newSdoRecord['tid'] = 0;
          }
        }
        return newSdoRecord;
      });
      const insertBody = await Promise.all(buildInsertBody);
      await this.sdoDbService.create(insertBody, table);
    } else {
      const updateBody = {
        shippeddate,
        tracking,
        logistic,
        deleted,
      };
      await this.sdoDbService.updateSdo(sdo, updateBody, table);
    }
  }

  async pullErpSdo(additionalParams: any = {}) {
    const pageSize = 30;
    const hourInMs = 60 * 60 * 1000;
    const startDate = new Date(Date.now() - 4 * hourInMs);

    let pageNum = 0;
    let totalPage = 1;
    
    while (pageNum < totalPage) {
      pageNum++;

      const response = await this.requestErpSdo(
        pageSize,
        pageNum,
        startDate,
        additionalParams,
      );

      if (
        response['success'] &&
        response['deliverys'] &&
        Array.isArray(response['deliverys'])
      ) {
        if (totalPage === 1) {
          totalPage = Math.ceil(response['total'] / pageSize);
        }
        for (const delivery of response['deliverys']) {
          await this.updateErpStatusToDb(delivery);
        }
      }
    }
  }

  // Update db from ERP
  async pullErpStatus() {
    const erpShops = await this.getErpShops();
    // pull order status by shop
    for (const shop of erpShops) {
      // pull SDO
      await this.pullErpSdo({ shop_code: shop.code });
      // pull cancelled SDO
      await this.pullErpSdo({ shop_code: shop.code, del: 1 });
    }
  }

  async getOrderStatusList() {
    const data = await this.categoryService.getChildren(601);
    return data;
  }

  async updateOrderByRefNumber(refNumber, updateData) {
    const result = this.update()
      .set(updateData)
      .where('ref_number = :refNumber', { refNumber: refNumber })
      .execute();
    return result;
  }
}
