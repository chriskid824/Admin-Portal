import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/models/BaseService';
import { ProductService } from 'src/product/product.service';
import { CategoryService } from 'src/product/category.service';
import orderFilterData from './orderFilterConfig';
import * as XLSX from 'xlsx';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';

@Injectable()
export class OrderExportService extends BaseService {
  constructor(
    @InjectConnection('backend') protected readonly connection: Connection,
    private readonly productService: ProductService,
    private readonly categoryService: CategoryService
  ) {
    super(connection);
  }

  protected tableName: string = 'sys_transition';
  protected tableAlias: string = 'o';

  public capFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  public async getSkuWithName(itemid, warehouse, custom_code = "") {
    let sku = '';
    let splitteditem = itemid.split(':::');
    let splittedwarehouse = warehouse.split(',');

    for (let i = 0; i < splitteditem.length; i++) {

      if (splitteditem[i] == '') {
        continue;
      }

      let splitted = splitteditem[i].split('-');
      let productid = splitted[0];
      let sizeid = splitted[1];
      let qty = splitted[2];

      let tempLocation = await this.categoryService.getWarehousesByProductId(productid, 3, 'category.createdate', 'DESC') ?? '';

      let details = await this.productService.getProductDetail(productid);

      let categoryId = await this.categoryService.getCategoryIdByProductId(productid);

      let sizeCode = await this.productService.getCustomCodeBySize(sizeid, categoryId);
 
      if (splittedwarehouse[i] == 'O' || splittedwarehouse[i] == 'S') {

        let names = await this.categoryService.getProductDetailsWithNameByProductId(productid);
        let location = '';

        names.forEach((name, index) => {

          location += (index == 0) ? this.capFirstLetter(name) : ':' + this.capFirstLetter(name);
        });

        if (location != '') {
          for (let x = 0; x < qty; x++) {
            sku += details['model_no'] + "-" + sizeCode + ":" + location + "<br/>" + details['name'] + "<br/>";
          }
        } else {
          for (let x = 0; x < qty; x++) {
            sku += details['model_no'] + "-" + sizeCode + ": " + tempLocation + "<br/>" + details['name'] + "<br/>";
          }
        }
      }
      else {
        for (let x = 0; x < qty; x++) {
          sku += details['model_no'] + "-" + sizeCode + ": " + tempLocation + "<br/>" + details['name'] + "<br/>";
        }
      }
    }
    if (custom_code.substring(0, 3).toUpperCase() == 'DAM') {
      sku = "DAM-" + sku;
    }
    return sku;
  }

  public async getProductDetailsByItemID(itemid): Promise<any> {

    let splitteditems = itemid.split(':::');

    let itemprice, cur, qty, sku, type;

    for (const splitteditem of splitteditems) {

      if (splitteditem == '') {
        continue;
      }

      let splitted = splitteditem.split('-');
      let productid = splitted[0];
      let sizeid = splitted[1];
      let stringQty = splitted[2];
      // Only for the first item
      // For EasyShip (expected to have only one item)
      itemprice = splitted[3];
      cur = splitted[4];

      let limit = 3;

      let tempLocation = await this.categoryService.getWarehousesByProductId(productid, limit);

      let categoryId = await this.categoryService.getCategoryIdByProductId(productid);

      let details = await this.productService.getProductDetail(productid);

      let sizeCode = await this.productService.getCustomCodeBySize(sizeid, categoryId);

      type = await this.categoryService.getProductTypeByProductId(productid);

      try {
        qty = parseInt(stringQty);
      } catch (e) {
        qty = 1;
      }

      for (let x = 0; x < qty; x++) {
        let tempSKU = details['model_no'] + "-" + sizeCode;
        if (x == 0) {
          sku = tempLocation ? tempSKU + ":" + tempLocation : tempSKU;
        } else {
          sku += tempLocation ? tempSKU + ":" + tempLocation : tempSKU;
        }
      }
    }

    let rate: number = 1;
    let rowRate = await this.getRate();
    let tempRate: string = 'USD' + cur + 'rate'
    if (rowRate[tempRate]) {
      rate = 1 / parseFloat(rowRate['USD' + cur + 'rate']);
    }

    let customvalue = Math.round(itemprice * rate);

    return { sku, itemprice, cur, qty, type, rate, customvalue, hkdrate: rowRate['USDHKDrate'] };
  }

  public async ecshipFormatValue(orders, data) {

    //Set hearder&subheader for EC-Ship
    let ws = XLSX.utils.aoa_to_sheet(data.ecship.headings);
    //Merge cells from A1:N1 (Excel formatting for EC-Ship)
    const merge = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 13 } },
      { s: { r: 0, c: 14 }, e: { r: 0, c: 18 } },
      { s: { r: 0, c: 19 }, e: { r: 0, c: 26 } },
      { s: { r: 0, c: 27 }, e: { r: 0, c: 41 } }
    ];
    ws["!merges"] = merge;

    //Overwirte cell R1 with new value (Excel formatting for EC-Ship)
    ws['O1'] = { v: 'Delivery Service' };
    ws['T1'] = { v: 'Customs Declaration' };
    ws['AB1'] = { v: 'Additional Information for Customs Declaration' };

    XLSX.utils.sheet_add_aoa(ws, data.ecship.titles, { origin: 'A2' });

    for (const [index, order] of orders.entries()) {
      let tempOrder = {};
      const tempItemCodeObj = await this.getProductDetailsByItemID(order.data.itemid);
      const tempIndex = (+index + +3).toString();

      // Set product value & insurance value
      let tempProductValue: number = tempItemCodeObj.customvalue;
      let productInsurance = 0;

      if (order.data.country !== 'India')
        tempProductValue = Math.min(750, tempProductValue);

      if (tempProductValue >= 400) {
        productInsurance = tempProductValue;
      }

      let productValue = Math.round(tempProductValue * tempItemCodeObj.hkdrate)
      productInsurance = Math.round(tempOrder['insurance'] * tempItemCodeObj.hkdrate);

      let tempState = this.checkState(order.data.state);
      let address2;
      if (tempState === 'USA') {
        tempOrder['country'] = tempState;
        tempOrder['country2'] = tempState;
        tempOrder['service'] = 'e-Express Service to the US';
      }

      if ((order.data.ref_number.match('KC') !== false) && (order.data.country == 'Hong Kong')) {
        let explodeAddress: Array<String> = order.data.address.split("<br/>");
        address2 = explodeAddress[0].replace(order.data.address1, "");
        address2 = address2.replace(/^\s+|\s+$/g, '');
      } else {
        address2 = order.data.address2;
      }
      //Remap and extract useful values from order
      //Get values from order object
      for (let item of data.ecship.values) {
        switch (item.value) {
          case 'itemscodeitems':
            tempOrder['itemscodeitems'] = tempItemCodeObj.sku;
            break;

          case 'itemscode':
            tempOrder['itemscode'] = tempItemCodeObj.sku;
            break;

          case 'ref_id':
            if (order.data.ref_number_prefix == 'KS') {
              tempOrder['ref_id'] = order.data.ref_number;
            } else {
              tempOrder['ref_id'] = this.getOrderRefNumPrefix(order) + '-' + order.data.transition_id;
            }
            break;

          case 'fulladdress':

            tempOrder['fulladdress'] = order.data.address1 + ',' + address2 + ',' + order.data.address3 + ',' + order.data.city;
            break;

          case 'address2_kc':
            tempOrder['address2_kc'] = address2;
            break;

          case 'items':
            tempOrder['items'] = tempItemCodeObj.type;
            break;

          case 'itemvalue':
            tempOrder['itemvalue'] = productValue;
            break;

          case 'insurance':
            tempOrder['insurance'] = productInsurance;
            break;

          default:
            if (item.hardcode !== true) {
              tempOrder[item.value] = order.data[item.value];
            } else
              break;
        }
      };

      if (order.data.shipment2 == 'LK') {
        tempOrder['country'] = order.data.country;
        tempOrder['country2'] = order.data.country;
        tempOrder['service'] = 'e-Express service';
      }

      switch (order.data.country) {
        case 'United States':
          tempOrder['country'] = 'USA';
          tempOrder['country2'] = 'USA';
          tempOrder['service'] = 'e-Express Service to the US';
          break;

        case 'Australia':
          tempOrder['country'] = 'Australia';
          tempOrder['country2'] = 'Australia (others)';
          tempOrder['service'] = 'e-Express service (including Australia, New Zealand, Korea, Singapore and Vietnam)';
          break;

        case 'Canada':
          tempOrder['country'] = 'Canada';
          tempOrder['country2'] = 'Canada';
          tempOrder['service'] = 'e-Express Service to Canada';
          break;

        case 'Japan':
          tempOrder['country'] = 'Japan';
          tempOrder['country2'] = 'Japan';
          tempOrder['service'] = 'e-Express Service to Japan';
          break;

        case 'Korea(South)':
        case 'South Korea':
          tempOrder['country'] = 'Korea, South';
          tempOrder['zip'] = order.data.zip.replace('/-/', '');
          tempOrder['country2'] = 'Korea, South';
          tempOrder['service'] = 'e-Express Service';

        case 'Russia':
          if (order.data.state == "") {
            tempOrder['state'] = order.data.city;
            tempOrder['service'] = 'e-Express Service';
          } else {
            tempOrder['country'] = 'Russian Federation';
            tempOrder['country2'] = 'Russian Federation';
            tempOrder['service'] = 'e-Express Service';
          }

        case 'Singapore':
          if (order.data.state == "") {
            tempOrder['state'] = 'Singapore';
            tempOrder['service'] = 'e-Express Service';
          }
      }

      // Set weight
      if ((/shoes/i).test(tempOrder['items'])) {
        tempOrder['weight'] = '0.5';
      } else if ((/socks/i).test(tempOrder['items'])) {
        tempOrder['weight'] = '0.05';
      } else {
        tempOrder['weight'] = '0.2';
      }

      //Casio Watch
      let tmpArr = order.data.itemid.split(":::");
      let tmpArr0 = tmpArr[0].split("-")

      let result00 = await this.getQueryBuilder()
        .select('category_id')
        .from('sys_r_category_product', 'r')
        .where('`category_id`=21')
        .andWhere('`product_id`=:product_id', { product_id: tmpArr0[0] })
        .getRawMany();

      if (result00.length > 0) {
        let result01 = await this.getQueryBuilder()
          .select('category_id')
          .from('sys_r_category_product', 'r')
          .where('`category_id`=233')
          .andWhere('`product_id`=:product_id', { product_id: tmpArr0[0] })
          .getRawMany();

        if (result01.length > 0) {
          tempOrder['items'] = 'Watch (not restricted as per special provision A123)';
        }
      }

      tempOrder['itemscodeitems'] += ':' + tempOrder['items'];
      //Temp ar object
      let ar = {};
      // Set value for each cells in Excel
      for (let cell of data.ecship.values) {
        if (cell.hardcodeValue === true && cell.value !== '') {
          ar[cell.cellValue + tempIndex] = { v: cell.value };
        } else if (tempOrder[cell.value]) {
          ar[cell.cellValue + tempIndex] = { v: tempOrder[cell.value] };
        } else {
          ar[cell.cellValue + tempIndex] = { v: '' };
        }
      };
      XLSX.utils.sheet_add_json(ws, [ar], { origin: ('A' + tempIndex), skipHeader: true });
    }
    return ws;
  }

  public async getRate() {
    return this.getQueryBuilder()
      .select()
      .from('sys_rate', 'r')
      .where('1')
      .orderBy(`datetime`, 'DESC')
      .getRawOne();
  }

  public checkState(state) {
    const specialCases = ['AE', , 'Ae', 'ae', 'AP', 'ap', 'APO', 'FPO'];
    if (specialCases.indexOf(state) > -1)
      return 'USA';
    else
      return state;
  }

  public async easyshipFormatValue(orders, data) {
    let easyShipArray = [];

    for (const order of orders) {
      let tempOrder = {};
      let tempItemCodeObj = await this.getProductDetailsByItemID(order.data.itemid);

      for (const object of data.easyship.values) {
        switch (object.value) {
          case 'ref_id':
          case 'ref_id2':
            if (order.data.ref_number_prefix == 'KS') {
              tempOrder[object.key] = order.data.ref_number;
            } else {
              tempOrder[object.key] = this.getOrderRefNumPrefix(order) + '-' + order.data.transition_id;
            }
            break;

          case 'address2_kc':
            if ((order.data.ref_number.includes('KC') !== false) && (order.data.country == 'Hong Kong')) {
              let explodeAddress: Array<String> = order.data.address.split("<br/>");

              tempOrder[object.key] = explodeAddress[0].replace(order.data.address1, "");
              tempOrder[object.key] = tempOrder['address2_kc'].replace(/^\s+|\s+$/g, '');

            } else {
              tempOrder[object.key] = order.data.address2;
            }
            break;

          case 'itemscode':
            tempOrder[object.key] = tempItemCodeObj.sku + ' Sport Shoes';
            break;

          case 'itemsku':
          case 'itemsku2':
            tempOrder[object.key] = tempItemCodeObj.sku.split('/')[0];
            break;

          case 'customvalue':
            let tempValue = tempItemCodeObj.customvalue;
            if (order.data.country !== 'India')
              tempValue = Math.min(750, tempValue);

            tempOrder[object.key] = tempValue;
            break;

          case 'itemqty':
            tempOrder[object.key] = tempItemCodeObj.qty;
            break;

          case 'state':
            tempOrder[object.key] = this.checkState(order.data.state);
            break;

          default:
            if (object.hardcodeValue == true) {
              tempOrder[object.key] = object.value;
            } else {
              tempOrder[object.key] = order.data[object.value];
            }
        }
      };


      switch (order.data.country) {
        case 'Korea(South)':
        case 'South Korea':
          tempOrder['Receiver\'s Postal Code*'] = order.data.zip.replace('/-/', '');
          break;

        case 'Russia':
          if (order.data.state == "")
            tempOrder['Receiver\'s State/Province'] = order.data.city;
          break;
        case 'Singapore':
          if (order.data.state == "")
            tempOrder['Receiver\'s State/Province'] = 'Singapore';
          break;
      }
      easyShipArray.push(tempOrder);
    };
    return XLSX.utils.json_to_sheet(easyShipArray);
  }
  //TODO: May merge with parseDateString from product.controller.ts 
  public secondsOrTimestampToDate(timestap, separator: string = '-', needTime: boolean = true) {
    let date: Date;
    if (typeof timestap === 'number') {
      date = new Date(timestap * 1000);
    } else {
      date = new Date(timestap);
    }
    let year = date.getFullYear();
    let month = ('0' + (date.getMonth() + 1)).slice(-2);
    let day = ('0' + date.getDate()).slice(-2);
    let hour = ('0' + date.getHours()).slice(-2);
    let minute = ('0' + date.getMinutes()).slice(-2);
    let second = ('0' + date.getSeconds()).slice(-2);
    let strTime = '';

    if (needTime) {
      strTime = hour + ':' + minute + ':' + second;
    }
    return year + separator + month + separator + day + ' ' + strTime;
  }

  public async SFFormatValue(orders, data) {
    let SFArray = [];
    for (const order of orders) {
      let tempOrder = {};
      let tempItemCodeObj = await this.getProductDetailsByItemID(order.data.itemid);
      let tempPrice;
      let rowRate = await this.getRate();
      //Set tempPrice
      if (tempItemCodeObj.cur == 'USD') {
        tempPrice = Math.round(tempItemCodeObj.itemprice * rowRate['USDHKDrate']);
      } else {
        if (tempItemCodeObj.cur == 'JPY') {
          tempPrice = Math.round(tempItemCodeObj.itemprice / (rowRate['USDJPYrate'] * rowRate['USDHKDrate']));
        } else {
          tempPrice = Math.round(tempItemCodeObj.itemprice);
        }
      }

      for (const object of data.SFship.values) {
        switch (object.value) {
          case 'ref_id':
            if (order.data.ref_number_prefix == 'KS') {
              tempOrder[object.key] = order.data.ref_number;
            } else {
              tempOrder[object.key] = this.getOrderRefNumPrefix(order) + '-' + order.data.transition_id;
            }
            break;

          case 'address':
            if ((order.data.ref_number.includes('KC') !== false) && (order.data.country == 'Hong Kong')) {
              let explodeAddress: Array<String> = order.data.address.split("<br/>");

              tempOrder[object.key] = explodeAddress[0].replace(order.data.address1, "");
              tempOrder[object.key] = tempOrder[object.key].replace(/^\s+|\s+$/g, '');

            } else {
              tempOrder[object.key] = order.data.address2;
            }
            break;

          case 'itemscode':
            tempOrder[object.key] = tempItemCodeObj.sku + ' Sport Shoes';
            break;

          case 'eTitle':
            tempOrder[object.key] = tempItemCodeObj.sku;
            break;

          case 'ePrice':
            tempOrder[object.key] = tempPrice;
            break;

          case 'cur':
            tempOrder[object.key] = tempItemCodeObj.cur;
            break;

          case 'price':
            tempOrder[object.key] = tempPrice * tempItemCodeObj.qty;
            break;

          case 'eCode':
            tempOrder[object.key] = tempItemCodeObj.sku;
            break;

          case 'country':
            // Upper case all characters in order.data.country
            let tempCountry = order.data.country.toUpperCase();
            switch (tempCountry) {
              case "HONG KONG":
                tempCountry = "香港";
                break;
              case "TAIWAN":
                tempCountry = "臺灣";
                break;
              case "CHINA":
                tempCountry = "中國";
                break;
              default:
                tempCountry = order.data.country;
                break;
            }
            tempOrder[object.key] = tempCountry;
            break;

          case 'eQty':
            tempOrder[object.key] = tempItemCodeObj.qty;
            break;

          case 'itemsku':
          case 'itemsku2':
            tempOrder[object.key] = tempItemCodeObj.sku.split('/')[0];
            break;
          default:
            if (object.hardcodeValue == true) {
              tempOrder[object.key] = object.value;
            } else {
              tempOrder[object.key] = order.data[object.value];
            }
        }
      }
      SFArray.push(tempOrder);
    }
    return XLSX.utils.json_to_sheet(SFArray);
  }

  public async ecpostFormatValue(orders, data) {
    let tempArray = [];
    for (const order of orders) {
      let tempOrder = {};
      const shippeddate = await this.getQueryBuilder()
        .select('s.shippeddate')
        .from('sys_sdo_web', 's')
        .where('s.deleted = 0')
        .andWhere('s.tid = :tid', { tid: order.data.transition_id })
        .getRawOne();

      for (const object of data.ecpost.values) {
        switch (object.value) {
          case 'status':

            const updatetime = Math.floor(new Date().getTime() / 1000) - order.data['status_update_date'];
            let tempTime: String;

            if (updatetime >= 86400) {
              tempTime = Math.round(updatetime / 86400) + ' Day(s)'
            }
            else if (updatetime >= 3600) {
              tempTime = Math.round(updatetime / 3600) + ' Hour(s)';
            } else {
              tempTime = Math.round(updatetime / 60) + ' Min(s)';
            }

            tempOrder[object.key] = order.data['status'] + "\n" + tempTime;
            break;

          case 'shippeddate':
            if (shippeddate) {
              tempOrder[object.key] = this.secondsOrTimestampToDate(shippeddate.shippeddate);
            } else {
              tempOrder[object.key] = '';
            }
            break;

          case 'items':
            tempOrder[object.key] = await this.productService.getProductNames(order.data.itemid);
            break;
          default:
            if (order.data[object.value]) {
              tempOrder[object.key] = order.data[object.value];
            } else {
              tempOrder[object.key] = '';
            }
        }
      }
      tempArray.push(tempOrder);
    }
    return XLSX.utils.json_to_sheet(tempArray);
  }

  public async JSONToExcelConvertor(JSONData, ReportTitle) {

    let arrData = typeof JSONData != 'object' ? JSON.parse(JSONData) : JSONData;
    const data = orderFilterData.orderFilterData;
    //Initialize a workbook
    let wb = XLSX.utils.book_new();
    let ws;
    switch (ReportTitle) {
      case 'ecship':
        ws = await this.ecshipFormatValue(arrData, data);
        break;
      case 'easyship':
        ws = await this.easyshipFormatValue(arrData, data);
        break;
      case 'SF':
        ws = await this.SFFormatValue(arrData, data);
        break;
      case 'ecpost':
        ws = await this.ecpostFormatValue(arrData, data);
        break;
    }
    XLSX.utils.book_append_sheet(wb, ws, 'KC_' + ReportTitle + new Date().getTime());
    return wb;
  }

  public async getMaxMailList() {
    return await this.getQueryBuilder()
      .select('id')
      .from('sys_mail_list', 'm')
      .where('id > 0')
      .andWhere("address != '' ")
      .andWhere("company != '' ")
      .getManyAndCount();
  }

  public getOrderRefNumPrefix(order) {
    return order.data['ref_number'].substring(0, 2).toUpperCase();
  }

  public async formatOrderForShippingLabel(orders, path) {
    let tempOrders = [];
    let acceptOrderPrefix;

    //Switch for possible future scaling
    switch (path.toUpperCase()) {
      case 'LK':
      case 'LKKC':
        acceptOrderPrefix = ['KC', 'IO', 'KS'];
        break;

      case 'GOAT':
        acceptOrderPrefix = ['GO'];
        break;

      default:
        acceptOrderPrefix = [];
        break;
    } 

    for (let order of orders) {

      order.data['tempPrefix'] = this.getOrderRefNumPrefix(order);

      if ( acceptOrderPrefix.indexOf(order.data['tempPrefix']) > -1
      && ( path == 'LKKC' ? order.data['erpid'] != '' : true) ) {
        if (path == 'GOAT') {
          let tempDeadline = await this.getQueryBuilder()
          .select('deadline')
          .from('goat_transition', 'g')
          .where('deleted = 0')
          .andWhere('g.number = :orderId', { orderId: order.data['order_id'] })
          .getRawOne();

          order.data['deadline'] = this.secondsOrTimestampToDate(tempDeadline.deadline);
        }
        
        order.data['labelOrderDate'] = this.secondsOrTimestampToDate(order.data['order_date'], '-', false);
        order.data['skuName'] = await this.getSkuWithName(order.data['itemid'], order.data['warehouse'], order.data['custom_code'])

        tempOrders.push(order);

      } else {
        continue;
      }
    }
    return tempOrders;
  }

  public async getPrintLabel(orders: Array<any>, query) {
    return await this.formatOrderForShippingLabel(orders, query.printLabel);
  }
}
