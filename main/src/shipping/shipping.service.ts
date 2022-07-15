import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { BaseService } from 'src/models/BaseService';
import { HttpService } from '@nestjs/axios';
import { Connection } from 'typeorm';
import { map } from 'rxjs';
import config from 'src/config';
import { lastValueFrom } from 'rxjs';
import { FedexService } from './fedex.service';
import shippingConfig, { Courier } from './shippingConfig';
import { Order } from 'src/models/Order';
import { OrderService } from 'src/order/order.service';
const md5 = require('md5');
const PDFMerger = require('pdf-merger-js');

@Injectable()
export class ShippingService extends BaseService {
  constructor(
    @InjectConnection('backend') protected readonly connection: Connection,
    private fedexService: FedexService,
    private httpService: HttpService,
    private orderService: OrderService,
  ) {
    super(connection);
  }
  protected tableName = 'sys_transition';
  protected tableAlias = 'transition';

  async createShipments(orders: Order[], courier?: Courier): Promise<Buffer> {
    if (orders.length === 0) {
      return Buffer.from('');
    }

    const canShipStatusList = await this.orderService.getStatusByGroup('Can-Ship');
    const tasks = orders
      .filter((order) => canShipStatusList.includes(order.data['status']))
      .map(async (order) => {
        return this.createShipment(order, courier);
      });
    let shipments = [];
    try {
      // TODO : better error handling
      shipments = (await Promise.all(tasks))
        .filter(result => !(result instanceof Error) && Boolean(result));
    } catch (e) {}
    
    if (shipments.length) {
      const merger = new PDFMerger();
      for (const shipment of shipments) {
        const { label } = shipment;
        await merger.add(label as Buffer);
      }

      // TODO : save label and invoice to GCS?

      return merger.saveAsBuffer();
    } else {
      return Buffer.from('');
    }
  }

  private async createShipment(order: Order, courier?: Courier): Promise<any> {
    // temporarily remove checking for staging
    // if (order.data['track_num']) {
    //   // should not happen
    //   console.log(`Order [${order.data['transition_id']}] already has tracking number [${order.data['track_num']}]`);
    //   return null;
    // }

    const countryCode = order.data['country_code'];
    const existingCourier = Courier[order.data['shipment2'].toUpperCase()];
    const countryCourier = this.getCourierByCountry(countryCode);
    const orderCourier = existingCourier || courier || countryCourier;
    if (!existingCourier && orderCourier) {
      // update order with selected courier 
      this.orderService.updateOrderByRefNumber(
        order.data['ref_number'],
        { shipment2: orderCourier },
      );
    }

    // TODO : shipment type
    let shipment = null;

    switch (orderCourier) {
      case Courier.FEDEX:
        console.log(`call fedexService.createShipment for order #${order.data['ref_number']}`);
        shipment = await this.fedexService.createShipment(order);
        break;
      
      default:
        console.log('unhandled courier', orderCourier);
        break;
    }

    if (shipment) {
      const { trackingNumber } = shipment;
      this.orderService.updateOrderByRefNumber(
        order.data['ref_number'],
        { track_num: trackingNumber },
      );
    }
    return shipment;
  }

  async getBytransitionID(transitionID) {
    return this.getQueryBuilder()
      .select()
      .from(this.tableName, this.tableAlias)
      .where('transition_id = :transitionID', { transitionID: transitionID })
      .getRawOne();
  }

  getCourierByCountry(countryCode: string): Courier {
    return shippingConfig.courier[countryCode] || null;
  }

  public async getSdo(transitionID) {
    const column = ['sdo', 'warehouse']
    return this.getQueryBuilder()
      .select(column)
      .from('sys_sdo_web', 'ssw')
      .where('tid = :transitionID', { transitionID: transitionID })
      .andWhere('deleted = 0')
      .getRawOne();
  }

  async updateStatus(trackNum) {
    const updateShippingStatus = this.getQueryBuilder()
      .update(this.tableName)
      .set({
        status: 'Address'
      })
      .where('track_num =:trackNum', { trackNum: trackNum })
      .execute();
    return updateShippingStatus;
  }

  public async insertOrderEvent(insertBody) {
    const insertOrderEvent = this.getQueryBuilder()
      .insert()
      .into('sys_transition_rm')
      .values(insertBody)
      .execute();
    return insertOrderEvent;
  }

  //Change Time zone
  changeTimezone(date, ianatz) {
    const invdate = new Date(
      date.toLocaleString('en-US', {
        timeZone: ianatz,
      }),
    );
    const diff = date.getTime() - invdate.getTime();
    return new Date(date.getTime() - diff);
  }

  timeFormat(time) {
    const timeFormat =
      time.getFullYear() +
      '-' +
      ('0' + (time.getMonth() + 1)).slice(-2) +
      '-' +
      ('0' + time.getDate()).slice(-2) +
      ' ' +
      ('0' + time.getHours()).slice(-2) +
      ':' +
      ('0' + time.getMinutes()).slice(-2) +
      ':' +
      ('0' + time.getSeconds()).slice(-2);
    return timeFormat;
  }

  async response(url, data): Promise<any> {
    return this.httpService.post(url, data).pipe(
      map((resp) => {
        return resp.data;
      }),
    );
  }

  async updateERPdelivery(SDO_num, tracking_num, express_code, area_id, timeFormat) {
    const secret = config.erp.secret;
    let process;
    if (area_id == 0) process = 'Print';
    if (area_id == 1) process = 'Scan';
    if (area_id == 2) process = 'Weight';
    const note = `Admin(${process})${express_code}, ${tracking_num}`;
    const arrData = {
      appkey: config.erp.appkey,
      sessionkey: config.erp.sessionkey,
      method: config.erp.erp_updateMethod,
      code: SDO_num,
      express_code: express_code,
      mail_no: tracking_num,
      deliverys_state_paramlist:
        [
          {
            area_id: area_id,
            operator: 'API(HK)',
            operator_date: timeFormat,
            note: note
          }
        ]
    };
    const tmpstr = md5(
      secret + JSON.stringify(arrData) + secret,
    ).toUpperCase();
    let postData = arrData;
    postData['sign'] = tmpstr;
    const response = await lastValueFrom(
      await this.response(
        'http://api.guanyiyun.com/rest/erp_open',
        postData,
      ),
    );
    if (response['success']) {
      console.log('Update success')
      return true
    }
    else {
      console.log('Update fail')
      return false;
    }
  }

  checkWarehouse(warehouseName) {
    const validWarehouseNames = ['KC-Shop', 'KCSHOP次品仓', 'Office', 'NoBox-Off', 'FR', 'Dunk', '拼多多海外', '京东国际', '天猫国际', '香港C仓库', '海外零售', '退货仓(HK)', 'KAFUNG(HK)', 'Oqium香港'];
    for (const validName of validWarehouseNames) {
      if (warehouseName.includes(validName)) {
        return true;
      }
    }
    return false;
  }

  async uploadLetterheadSignature(
    file: Express.Multer.File,
  ): Promise<any> {
    // TODO: test + refine + error handling
    const tasks = [
      this.fedexService.uploadLetterheadImage(file),
    ];
    return Promise.all(tasks);
  }
}
