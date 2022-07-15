import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { lastValueFrom, Observable } from 'rxjs';
import config from 'src/config';
const md5 = require('md5');

@Injectable()
export class ErpService {
  constructor(
    private httpService: HttpService,
  ) {}

  doomsDayString = '2500-12-31 00:00:00';

  async requestErpApi(
    additionalParams: any,
    method: string,
    pageNum: number,
    pageSize: number,
  ) {
    const {
      appkey,
      sessionkey,
      secret
    } = config.erp;

    const postData = {
      appkey,
      sessionkey,
      method: method,
      page_no: pageNum,
      page_size: pageSize,
    };
    // Add additional params to the post data
    Object.keys(additionalParams).forEach((key) => {
      postData[key] = additionalParams[key];
    });
  
    const sign = md5(secret + JSON.stringify(postData) + secret).toUpperCase();
    postData['sign'] = sign;
  
    const url = 'http://api.guanyiyun.com/rest/erp_open';
    const headers = {
      'Content-Type': 'application/json',
    };
    let responseData;
    try {
      const source: Observable<any> = this.httpService
        .post(url, postData, { headers })
        .pipe();
      const response = await lastValueFrom(source);
      responseData = response?.data;
    } catch (error) {
      console.error('Failed to request ERP API:', error.response.status, error.response.stateText);
      console.error(error.response.data);
      throw error;
    }
    return responseData;
  }

  async fetchDeliveries(
    pageSize: number,
    pageNum: number,
    startDateStr: string,
    additionalParams: any = {},
  ) {
    const method = 'gy.erp.trade.deliverys.get';
    additionalParams = Object.assign({
      shop_code: 'Shopify',
      start_modify_date: startDateStr,
      end_modify_date: this.doomsDayString,
    }, additionalParams);
    const json = await this.requestErpApi(additionalParams, method, pageNum, pageSize);
    if (json['success'] && json.hasOwnProperty('deliverys')) {
      json['deliverys'] = json['deliverys'].map((delivery) => {
        if (delivery['platform_code']) {
          delivery['platform_code'] = this.sanitisePlatformCode(delivery['platform_code']);
        }
        return delivery;
      });
    }
    return json;
  }
  
  sanitisePlatformCode(platformCode: string): string {
    const prefixes = [
      'KC-',
      'EC-',
      'KF-',
      'CO-',
      'HK-',
      'E5-',
      'GO-',
      'FB-',
      'JY-',
      'JR-',
      'SX-',
      'GA-',
      'PH-',  // price.com.hk KCPRICEHK
      'IO-',  // APP
    ];
    const regexStr = ['\\s+', ...prefixes].join('|');
    const regex = new RegExp(regexStr, 'g');
    return platformCode.replace(regex, '');
  }
}
