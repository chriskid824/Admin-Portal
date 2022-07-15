import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import * as FormData from 'form-data';
import { lastValueFrom, Observable } from 'rxjs';
import { OrderService } from 'src/order/order.service';
import { StockService } from 'src/product/stock.service';
import config from 'src/config';
import fedexConfig from './fedexConfig';
import { LocationService } from './location.service';
import { Order } from 'src/models/Order';

type ShipFromCodeType = 'hk' | 'jp' | 'jp2' | 'jp3';

@Injectable()
export class FedexService {
  constructor(
    private locationService: LocationService,
    private httpService: HttpService,
    private orderService: OrderService,
    private stockService: StockService,
  ) { }

  private accessToken: string;
  private accessTokenExpiry: number;

  async post(api: string, data: any, httpConfig: any, hostType?: string): Promise<any> {
    const host = config.fedex.host[hostType] ?? config.fedex.host.default;
    const url = `${host}${api}`;
    let responseData;
    try {
      const source: Observable<any> = this.httpService
        .post(url, data, httpConfig)
        .pipe();
      const response = await lastValueFrom(source);
      responseData = response?.data;
    } catch (error) {
      // console.error(error);
      console.error(error.response.status, error.response.stateText);
      console.error(error.response.data);
      throw error;
    }
    return responseData;
  }

  private async getToken(): Promise<string> {
    if (this.accessToken && this.accessTokenExpiry > Date.now()) {
      return this.accessToken;
    }

    const { id, secret } = config.fedex;
    const api = '/oauth/token';
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: id,
      client_secret: secret,
    });
    const response = await this.post(api, params, { headers });
    const { access_token: accessToken, expires_in: expiresIn } = response;
    if (accessToken) {
      this.accessToken = accessToken;
      this.accessTokenExpiry = Date.now() + (1000 * expiresIn);
    }
    return this.accessToken;
  }

  // FedEx Ship API Create Shipment Ref:
  // https://developer.fedex.com/api/en-us/catalog/ship/docs.html#operation/Create%20Shipment
  async createShipment(
    order: Order,
    shipFromCode: ShipFromCodeType = 'hk',
  ): Promise<any> {
    const accessToken = await this.getToken();
    const api = '/ship/v1/shipments';
    const headers = {
      'content-type': 'application/json',
      'x-locale': 'en_US',
      authorization: `Bearer ${accessToken}`,
    };

    const shipper = fedexConfig.shipper[shipFromCode];
    const { address: { countryCode } } = shipper;
    const params = {
      requestedShipment: await this.buildRequestedShipment(order, shipFromCode),
      labelResponseOptions: 'LABEL',
      accountNumber: {
        value: fedexConfig.accountNumber[countryCode],
      },
    };

    const response = await this.post(api, params, { headers });
    const { output: { transactionShipments: [ shipment ]} } = response;
    const {
      masterTrackingNumber: trackingNumber,
      pieceResponses: [{ packageDocuments }],
    } = shipment;
    const [{ encodedLabel } = { encodedLabel: '' }] = packageDocuments.filter(
      ({ contentType }) => contentType === 'LABEL'
    );
    // TODO : invoice handling
    const [{ url: invoice } = { url: '' }] = packageDocuments.filter(
      ({ contentType }) => contentType === 'COMMERCIAL_INVOICE'
    );

    const label = Buffer.from(encodedLabel, 'base64');

    return {
      trackingNumber,
      label,
      invoice,
    };
  }

  // FedEx Trade documents upload API Upload Images Ref:
  // https://developer.fedex.com/api/en-us/catalog/upload-documents/v1/docs.html#operation/Image%20Upload%20Service%20Info
  async uploadImages(params: any): Promise<any> {
    const accessToken = await this.getToken();
    const api = '/documents/v1/lhsimages/upload';
    const headers = {
      'content-type': 'multipart/form-data',
      'x-customer-transaction-id': '771407-1',
      authorization: `Bearer ${accessToken}`,
    };

    const response = await this.post(api, params, { headers }, 'tradeDocumentsUpload');
    console.log(response);
    const { output } = response;
    console.log(output);
    return '';
  }


  async uploadLetterheadImage(
    file: Express.Multer.File,
  ): Promise<any> {
    const now = new Date();
    const nowYear = now.getUTCFullYear();
    const nowMonth = ('00' + now.getUTCMonth()).slice(-2);

    const document = {
      referenceId: `IMAGE_1_${nowYear}${nowMonth}`,
      name: file.originalname,
      contentType: file.mimetype,
      rules: {
        workflowName: 'LetterheadSignature',
      },
      meta: {
        imageType: 'SIGNATURE',
        imageIndex: 'IMAGE_1',
      },
    };

    const formData: FormData = new FormData();
    formData.append('attachment', file.buffer, { filename: file.originalname });
    formData.append('document', JSON.stringify(document));

    return this.uploadImages(formData);
  }


  async buildRequestedShipment(
    order: Order,
    shipFromCode: ShipFromCodeType = 'hk',
  ): Promise<any> {
    const defaults = fedexConfig.default.requestedShipment;
    const {
      shippingChargesPaymentType: paymentType,
    } = fedexConfig;

    const shipper = fedexConfig.shipper[shipFromCode];
    const { address: { countryCode } } = shipper;
    const recipient = await this.buildRecipient(order);
    const { country: recipientCountry } = order.data as any;
    const shipmentSpecialServices = this.getConfig('shipmentSpecialServices', recipientCountry);
    const shippingDocumentSpecification = this.getConfig('shippingDocumentSpecification', recipientCountry);
    
    const additionalValues = {
      shipper,
      recipients: [recipient],
      shippingChargesPayment: {
        paymentType,
        payor: {
          responsibleParty: {
            accountNumber: {
              value: fedexConfig.accountNumber[countryCode],
            },
          },
        },
      },
      shipmentSpecialServices,
      customsClearanceDetail: await this.buildCustomsClearanceDetails(order, shipFromCode),
      shippingDocumentSpecification,
      totalPackageCount: 1,
      requestedPackageLineItems: [this.buildPackageLineItem()],
    };
    return Object.assign({}, defaults, additionalValues);
  }

  async buildCustomsClearanceDetails(
    order: Order,
    shipFromCode: ShipFromCodeType,
    termsOfSale = 'DDU'
  ): Promise<any> {
    const {
      customerReferences,
      countryOfManufacture,
      currency,
      weight,
      harmonizedCode,
      quantityUnits,
    } = fedexConfig;

    const {
      amount,
      totalqty: quantity,
    } = order.data as any;

    let dutiesPayment;
    if (termsOfSale === 'DDP') {
      const shipper = fedexConfig.shipper[shipFromCode];
      const { address: { countryCode } } = shipper;
      dutiesPayment = {
        paymentType: 'SENDER',
        payor: {
          responsibleParty: {
            address: {
              countryCode
            },
            accountNumber: fedexConfig.accountNumber[countryCode],
          },
        },
      }
    } else {
      dutiesPayment = {
        paymentType: 'RECIPIENT',
      };
    }

    const description = await this.buildOrderDescription(order);

    const unitPrice = {
      amount: Math.round(amount / quantity),
      currency,
    };

    let ret = {
      commercialInvoice: {
        customerReferences,
        termsOfSale,
      },
      dutiesPayment,
      commodities: [{
        unitPrice,
        numberOfPieces: 1,
        quantity,
        quantityUnits,
        customsValue: unitPrice,
        countryOfManufacture,
        harmonizedCode,
        description,
        weight,
        totalCustomsValue: {
          amount,
          currency,
        },
      }],
    };

    return ret;
  }

  // fedexAPI > ShipWebServiceClient.php > get_custom_code
  async buildOrderCustomCode(itemIdStr: string, customCode: string): Promise<string> {
    const customCodeTasks = itemIdStr.split(':::').map(async (ids) => {
      if (!ids.trim()) {
        return null;
      }
      const [productId, sizeId, count] = ids.split('-').map((s) => parseInt(s));
      const { sku } = await this.stockService.getSkuByProductAndSize(productId, sizeId);
      if (!sku) {
        return false;
      }
      if (count > 1) {
        return `${sku}x${count}`;
      }
      return sku;
    });
    
    const customCodes = await Promise.all(customCodeTasks);
    
    // join non-empty values, fallback to order.data['custom_code'] if final value is empty
    let itemCustomCode = customCodes.filter(Boolean).join(',');
    if (itemCustomCode) {
      if (customCode.slice(0, 3).toUpperCase() === 'DAM') {
        itemCustomCode = `DAM-${itemCustomCode}`;
      }
    } else {
      itemCustomCode = customCode;
    }

    return itemCustomCode;
  }

  async buildOrderDescription(order: Order): Promise<string> {
    const {
      transition_id: id,
      ref_number_prefix: refPrefix,
      ref_number: refNumber,
      itemid,
      custom_code: customCode,
    } = order.data as any;

    const orderCustomCode = await this.buildOrderCustomCode(itemid, customCode);
    const warehouseCode = await this.getWarehouseCode(id);
    const locationCode = await this.getLocationCode(customCode);

    let refNumberStr = '';
    switch (refPrefix) {
      case 'KS':
        refNumberStr = refNumber;
        break;
      default:
        refNumberStr = `${refNumber.slice(0, 2)}-${id}`;
        break;
    }

    const itemName = await this.getItemName(customCode);

    return `${orderCustomCode};(${warehouseCode})${locationCode};${refNumberStr};${itemName}`;
  }

  buildPackageLineItem(needSign: boolean = false, signType: string = 'ADULT'): any {
    const {
      weight,
      dimensions,
    } = fedexConfig;

    const packagingLineItem = {
      sequenceNumber: 1,
      weight,
      dimensions,
    };

    if (needSign) {
      Object.assign(packagingLineItem, {
        packageSpecialServices: {
          specialServiceTypes: 'SIGNATURE_OPTION',
          signatureOptionType: {
            optionType: signType,
          },
        },
      });
    }
    
    return packagingLineItem;
  }

  async buildRecipient(order: Order): Promise<any> {
    const {
      // address
      address1,
      address2,
      city,
      state,
      state_code: stateCode,
      zip: postalCode,
      country_code: countryCode,

      // contact
      contactperson: personName,
      contact_email: emailAddress,
      contactnumber: phoneNumber,
    } = order.data as any;

    const stateOrProvinceCode = await this.locationService.getStateCode(state);

    const streetLines1 = this.buildStreetLines(address1);
    const streetLines2 = this.buildStreetLines(address2);
    const streetLines = [...streetLines1, ...streetLines2];

    return {
      address: {
        streetLines,
        city,
        stateOrProvinceCode,
        postalCode,
        countryCode,
        residential: false,
      },
      contact: {
        personName,
        emailAddress,
        phoneNumber,
      }
    };
  }

  buildStreetLines(address: string, delimiter: string = ','): string[] {
    if (!address.trim()) {
      return [];
    }
    if (address.length > fedexConfig.streetLinesMaxLength) {
      return address.split(delimiter).reduce(
        (arr: string[], line: string): string[] => {
          return [...arr, ...this.buildStreetLines(line, ' ')];
        }, 
        []
      );
    }
    return [address];
  }

  getConfig(configName: string, attributeName?: string): any {
    const config = fedexConfig[configName] ?? {};
    if (attributeName) {
      if (config.hasOwnProperty(attributeName)) {
        return config[attributeName];
      } else {
        return config.default;
      }
    }
    return config;
  }

  async getItemName(skusStr: string): Promise<string> {
    const skus = this.getSkus(skusStr);
    const tasks = skus.map(async (sku) =>
      this.stockService.getProductNameBySku(sku)
    );
    const nameList = await Promise.all(tasks);
    return nameList.filter(Boolean).join(';');
  }

  async getLocationCode(skusStr: string): Promise<string> {
    const skus = this.getSkus(skusStr);
    const tasks = skus.map(async (sku) => {
      const column = 'name';
      const rows = await this.stockService.getLocationCodesBySku(sku, 2, column);
      const codes = rows.map((row) => row[column])
      const codeStr = codes.join(',')
        .replace(/S/, 'S-')
        .replace(/O/, 'O-');
      return codeStr;
    });
    const codeList = await Promise.all(tasks);
    return codeList.filter(Boolean).join(';');
  }

  getSkus(skusStr: string): string[] {
    const skus = skusStr.split('--')
      .map((s) => s.split(':')[0])
      .filter((s) => Boolean(s.trim()));
    return skus;
  }

  async getWarehouseCode(id: number): Promise<string> {
    const warehouseDetails = await this.orderService.getERPWarehouse(id);
    if (!warehouseDetails) {
      return '';
    }

    const { code, warehouse } = warehouseDetails;
    if (code) {
      switch (code) {
        case 'GDCDP':
        case 'GDCC':
        case 'GDC':
        case 'SX/GO RETURN':
          return 'OF';
        case 'MER2A':
          return 'OQ';
        case 'KHOUSE1A':
          return 'KA';
        case 'CREW':
          return 'CS';
        default:
          return code;
      }
    } else {
      return warehouse ?? '';
    }
  }
}
