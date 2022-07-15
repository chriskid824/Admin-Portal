import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

import db from '../db';
import trackBySFTrackNum from '../sf';
import { fedEx } from '../fedex';
import trackByDpexTrackNum from '../dpex';
import { ShopifyWebhookMessages } from '../models/shopifyWebhookMessages'

// Different types of order statuses. Shopify has partial fulfilled but
// I don't think we need that because we only have 1 item per order.
export enum StatusType {
  ORDER_CREATED = 'order-created',
  ORDER_PAID = 'order-paid',
  ORDER_FULFILLED = 'order-fulfilled',
  ORDER_CANCELLED = 'order-cancelled',
  ORDER_PICKED_UP = 'order-picked-up',
  ORDER_DELIVERED = 'order-delivered',
  ORDER_COMPLETED = 'order-completed',
  SELLER_CONFIRMED = 'seller-confirmed',
  SELLER_SHIPPED = 'seller-shipped',
  KICKSCREW_RECEIVED = 'kickscrew-received',
}

enum KutuStatusType {
  PENDING = 'PENDING',
  PURCHASED = 'PURCHASED',
  IN_STOCK = 'IN_STOCK',
  NOT_FOUND = 'NOT_FOUND',
  UNKNOWN = 'UNKNOWN',
}

type KutuStatus = {
  type: KutuStatusType;
  datetime?: Date;
  purchaseTime?: Date | null;
};

type Status = {
  type: StatusType;
  datetime: Date;
  details?: any;
};

export class Order {
  id: string;
  shopifyOrderId: number | null;
  status: Status[];
  updatedAt: Date | null;
  private statusTypeSet: Set<StatusType>;

  constructor(id: string) {
    // Lower case id
    this.id = id.toLowerCase();
    this.status = [];
    this.updatedAt = null;
    this.shopifyOrderId = null;

    // An extra data structure to improve the performance of hasStatus
    // This must be kept in sync with `status`
    this.statusTypeSet = new Set();
  }

  /**
   * Add a new status to the order.
   */
  addStatusSafe(status: any) {
    if (!status.datetime || !status.type) {
      console.error('Invalid status:', status);
      throw new Error('Invalid status');
    }

    let datetime: Date;
    try {
      if (typeof status.datetime === 'number') {
        const todayUnixInMs = new Date().getTime();
        if (status.datetime < todayUnixInMs / 10) {
          // status.datetime is in seconds, not ms, because it is very small
          datetime = new Date(status.datetime * 1000);
        } else {
          datetime = new Date(status.datetime);
        }
      } else {
        datetime = new Date(status.datetime);
      }
      console.log('datetime:', datetime);
    } catch (e) {
      console.error(e);
      throw new Error('Status datetime is invalid');
    }

    const validStatus: Status = {
      type: status.type,
      datetime: datetime,
    };
    if (status.details) {
      // Details must be an object
      if (typeof status.details !== 'object') {
        console.error('Invalid status details:', status.details);
        throw new Error('Invalid status details');
      }
      validStatus.details = status.details;
    }
    this.addStatus(validStatus);
  }

  hasStatus(type: StatusType) {
    return this.statusTypeSet.has(type);
  }

  addStatus(status: Status) {
    if (this.hasStatus(status.type)) {
      console.log('Status already exists:', status);
    } else {
      this.status.push(status);
      this.statusTypeSet.add(status.type);
      // sort status by datetime ascending
      this.status.sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
    }
  }

  processShopifyWebhook(topic: string, data: any): boolean {
    let newStatus: Status | null = null;
    let mutated = false;

    if (!this.shopifyOrderId && data?.id) {
      this.shopifyOrderId = data.id;
      mutated = true;
    }

    if (topic === 'orders/create') {
      const datetime = data?.created_at
        ? new Date(data.created_at)
        : new Date();
      newStatus = {
        type: StatusType.ORDER_CREATED,
        datetime,
      };
    } else if (topic === 'orders/paid') {
      newStatus = {
        type: StatusType.ORDER_PAID,
        datetime: new Date(),
      };
    } else if (topic === 'orders/fulfilled') {
      newStatus = {
        type: StatusType.ORDER_FULFILLED,
        datetime: new Date(),
      };
    } else if (topic === 'orders/cancelled') {
      const datetime = data?.cancelled_at
        ? new Date(data.cancelled_at)
        : new Date();
      newStatus = {
        type: StatusType.ORDER_CANCELLED,
        datetime,
      };
    }

    if (newStatus) {
      this.addStatus(newStatus);
      mutated = true;
    }
    return mutated;
  }

  getFedExPickedUpAndDelivered(events, status) {
    // status = 'Picked up' | 'Delivered'
    const eventList = events.filter((event) => {
      return event['derivedStatus'] == status;
    });
    let result;
    if (eventList.length > 0) {
      result = eventList.reduce((result, event) => {
        switch (status) {
          case 'Picked up':
            return event.date < result.date ? event : result;
          case 'Delivered':
            return event.date > result.date ? event : result;
        }
      });
    }
    return result;
  }

  async updateFedExStatus(trackingNumber) {
    let isChanged = false;
    const trackResult = await fedEx.trackByFedExTrackNum(trackingNumber);
    if (trackResult) {
      const events = trackResult['output']['completeTrackResults'][0]['trackResults'][0]['scanEvents'];
      const fedExObjList = [
        // Handle ORDER_PICKED_UP
        {
          statusType: StatusType.ORDER_PICKED_UP,
          keyword: 'Picked up',
        },
        // Handle ORDER_DELIVERED
        {
          statusType: StatusType.ORDER_DELIVERED,
          keyword: 'Delivered',
        },
      ];
      for (const fedExObj of fedExObjList) {
        if (!this.hasStatus(fedExObj.statusType)) {
          const fedExStatus = this.getFedExPickedUpAndDelivered(events, fedExObj.keyword);
          if (fedExStatus) {
            isChanged = true;
            this.addStatus({ type: fedExObj.statusType, datetime: new Date(fedExStatus['date']) });
          }
        }
      }
    }
    if (isChanged) {
      await this.save();
    }
  }

  getSFPickedUpAndDelivered(routes, status){
    const eventList = routes.filter((event) => {
      return event['opCode'] == status;
    });
    let result;
    if (eventList.length > 0) {
      result = eventList.reduce((result, event) => {
        switch (status) {
          case '50': // Picked up
            return event.acceptTime < result.acceptTime ? event : result;
          case '80': // Delivered
            return event.acceptTime > result.acceptTime ? event : result;
        }
      });
    }
    return result;
  }

  async updateSFStatus(trackingNumber, phoneNumber){
    let isChanged = false;
    const trackResult = await trackBySFTrackNum(trackingNumber, phoneNumber);
    if (trackResult) {
      const apiResultData = JSON.parse(trackResult['apiResultData']);
      const routes = apiResultData['msgData']['routeResps'][0]['routes'];
      const SFObjList = [
        {
          statusType: StatusType.ORDER_PICKED_UP,
          keyword: '50', // SF Picked up opCode
        },
        {
          statusType: StatusType.ORDER_DELIVERED,
          keyword: '80', // SF Delivered odCode
        },
      ];
      for (const SFObj of SFObjList) {
        if (!this.hasStatus(SFObj.statusType)) {
          const SFStatus = this.getSFPickedUpAndDelivered(routes, SFObj.keyword);
          if (SFStatus) {
            isChanged = true;
            this.addStatus({ type: SFObj.statusType, datetime: new Date(SFStatus['acceptTime']) });
          }
        }
      }
    }
    if (isChanged) {
      await this.save();
    }
  }

  getDpexPickedUpAndDelivered(events, eventId) {
    // eventId { 
    //    1: Delivered,
    //    2: Collection,
    // }
    const eventList = events.filter((event) => {
      return event['EventID']['_text'] == eventId;
    });
    let result;
    if (eventList.length > 0) {
      result = eventList.reduce((result, event) => {
        switch (eventId) {
          case '2':
            return new Date(event.EventUTCDateTime._text) < new Date(result.EventUTCDateTime._text) ? event : result;
          case '1':
            return new Date(event.EventUTCDateTime._text) > new Date(result.EventUTCDateTime._text) ? event : result;
        }
      });
    }
    return result?.EventUTCDateTime._text;
  }

  async updateDpexStatus(trackingNumber) {
    let isChanged = false;
    const events = await trackByDpexTrackNum(trackingNumber);
    if (events) {
      const dpexObjList = [
        // Handle ORDER_PICKED_UP
        {
          statusType: StatusType.ORDER_PICKED_UP,
          EventID: '2',
        },
        // Handle ORDER_DELIVERED
        {
          statusType: StatusType.ORDER_DELIVERED,
          EventID: '1',
        },
      ];
      for (const dpexObj of dpexObjList) {
        if (!this.hasStatus(dpexObj.statusType)) {
          const dpexStatus = this.getDpexPickedUpAndDelivered(events, dpexObj.EventID);
          if (dpexStatus) {
            isChanged = true;
            this.addStatus({ type: dpexObj.statusType, datetime: new Date(dpexStatus + ' UTC') });
          } else {
            console.log('dpexStatus not found.')
          }
        }
      }
    } else {
      console.log('Events not found.')
    }
    if (isChanged) {
      await this.save();
    }
  }
  getPhoneNumber(shopifyDOC){
    const phoneNumber1 = shopifyDOC['message']['customer']['default_address']['phone'];
    const phoneNumber2 = shopifyDOC['message']['customer']['phone'];
    if (phoneNumber1) {
      return phoneNumber1.substr(phoneNumber1.length - 4);
    }
    if (phoneNumber2) {
      return phoneNumber2.substr(phoneNumber2.length - 4);
    }
    return '0000';
  }

  async updateOrderPickedUpAndDelivered() {
    if (!this.hasStatus(StatusType.ORDER_DELIVERED)) {
      const shopifyDOC = await ShopifyWebhookMessages.findByOrderId(this.id.toUpperCase());
      if (shopifyDOC) {
        const shopifyFulfillment = shopifyDOC['message']['fulfillments'][0];
        const trackingNumber = shopifyFulfillment.tracking_number;
        const trackingCompany = shopifyFulfillment.tracking_company.toLowerCase();
        const phoneNumber = this.getPhoneNumber(shopifyDOC);
        console.log(`[${trackingCompany}]`, 'trackingNumber:', trackingNumber);
        if (shopifyFulfillment.status == 'success') {
          try {
            if (trackingCompany.includes('fedex')) {
              console.log('FedEx Status Updating');
              await this.updateFedExStatus(trackingNumber);
            } else if (trackingCompany.includes('dpex')) {
              console.log('DPEX Status Updating');
              await this.updateDpexStatus(trackingNumber);
            } else if (trackingCompany.includes('sf')){
              console.log('SF Status Updating')
              await this.updateSFStatus(trackingNumber, phoneNumber);
            }
          } catch (error) {
            console.error(error);
          }
        }
      }
    }
  }

  async updateOrderCompleted() {
    if (this.hasStatus(StatusType.ORDER_DELIVERED) && !this.hasStatus(StatusType.ORDER_COMPLETED)) {
      let updated = false;
      for (let status of this.status) {
        // Find status type equal ORDER_DELIVERED
        if (status.type == StatusType.ORDER_DELIVERED) {
          const current = Date.now();
          const twoDaysAfter = status.datetime.getTime() + 1000 * 60 * 60 * 24 * 2;
          if (current >= twoDaysAfter) { // It means order completed status should in this order
            updated = true;
            this.addStatus({ type: StatusType.ORDER_COMPLETED, datetime: new Date(twoDaysAfter) });
          }
        }
      }
      if (updated) {
        await this.save();
      }
    }
  }

  isPurchasing() {
    // This code is not optimized but it works.
    if (this.hasStatus(StatusType.SELLER_CONFIRMED)) {
      return false;
    }
    if (this.hasStatus(StatusType.KICKSCREW_RECEIVED)) {
      return false;
    }
    if (this.hasStatus(StatusType.ORDER_FULFILLED)) {
      return false;
    }
    if (this.hasStatus(StatusType.ORDER_CANCELLED)) {
      return false;
    }
    return true;
  }

  private async refreshKutuStatusIfNeeded(): Promise<boolean> {
    let mutated = false;
    if (this.isPurchasing()) {
      console.log('Order is purchasing');
      try {
        const { type, datetime, purchaseTime } = await this.fetchKutuStatus();
        if (type === KutuStatusType.PURCHASED) {
          if (!datetime) {
            console.error('Kutu status is PURCHASED but datetime is null');
          }
          const validDatetime = datetime ?? new Date();
          this.addStatus({
            type: StatusType.SELLER_CONFIRMED,
            datetime: validDatetime,
          });
          mutated = true;
        } else if (type === KutuStatusType.IN_STOCK) {
          if (!datetime) {
            console.error('Kutu status is IN_STOCK but datetime is null');
          }
          const validDatetime = datetime ?? new Date();
          this.addStatus({
            type: StatusType.SELLER_SHIPPED,
            datetime: validDatetime,
          });
          mutated = true;
        }
        if (purchaseTime && !this.hasStatus(StatusType.SELLER_CONFIRMED)) {
          this.addStatus({
            type: StatusType.SELLER_CONFIRMED,
            datetime: new Date(purchaseTime),
          });
          mutated = true;
        }
      } catch (e) {
        // This shouldn't fail due to Kutu being down. The show must go on.
        console.error(e);
      }
    }
    return mutated;
  }
  async refreshStatusIfNeeded() {
    const mutated = await this.refreshKutuStatusIfNeeded();
    // Save the order to database if needed
    if (mutated) {
      await this.save();
    }
  }

  async fetchKutuStatus(): Promise<KutuStatus> {
    const url = `https://go.kickscrew.com.cn/app/order/status?outer_id=${this.id}`;
    const header = {
      'Content-Type': 'application/json',
      token: process.env.KUTU_TOKEN ?? '',
    };
    const response = await fetch(url, {
      method: 'GET',
      headers: header,
    });
    const json = await response.json();
    console.log('Kutu status:', json);
    if (json.code === -1) {
      return { type: KutuStatusType.NOT_FOUND };
    } else if (json.code === 0) {
      const data = json.data;
      const datetime = new Date(data.UPDATED_AT + '+0800');
      let purchaseTime: Date | null = null;
      if (data.PURCHASE_TIME) {
        purchaseTime = new Date(data.PURCHASE_TIME + '+0800');
      }
      if (data.STATUS === '已入库') {
        return {
          type: KutuStatusType.IN_STOCK,
          datetime,
          purchaseTime,
        };
      } else if (data.STATUS === '待处理') {
        return {
          type: KutuStatusType.PENDING,
          datetime,
          purchaseTime,
        };
      } else if (data.STATUS === '已采购') {
        return {
          type: KutuStatusType.PURCHASED,
          datetime,
          purchaseTime,
        };
      } else {
        return {
          type: KutuStatusType.UNKNOWN,
          purchaseTime,
        };
      }
    } else {
      throw new Error(`Unknown Kutu status code: ${json.code}`);
    }
  }

  // Warning: changing members of the returned object might mutate the
  // original object
  toJSON() {
    const data: any = { ...this };
    delete data.statusTypeSet;
    return data;
  }

  static async findById(id: string): Promise<Order | null> {
    const collection = db.collection('orders');
    const ref = collection.doc(id.toLowerCase());
    const doc = await ref.get();
    const data = doc.data();
    if (!data) {
      return null;
    }
    const order = new Order(id);
    order.shopifyOrderId = data.shopifyOrderId ?? null;
    try {
      order.updatedAt = data.updatedAt.toDate();
      for (const s of data.status) {
        try {
          s.datetime = s.datetime ? s.datetime.toDate() : null;
        } catch (e) {
          s.datetime = null;
          console.error(e);
        }
        order.addStatus(s);
      }
    } catch (e) {
      console.error(e);
      order.updatedAt = null;
    }
    console.log('Order found:', order);
    return order;
  }

  async save() {
    this.updatedAt = new Date();
    const collection = db.collection('orders');
    const ref = collection.doc(this.id);
    await ref.set(this.toJSON());
  }
}
