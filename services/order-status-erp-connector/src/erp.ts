import fetch from 'node-fetch';
import md5 from 'md5';
import dotenv from 'dotenv';

dotenv.config();

const secret = process.env.ERP_SECRET;
const erpAppKey = process.env.ERP_APPKEY;
const erpSessionKey = process.env.ERP_SESSIONKEY;

const doomsDayString = '2500-12-31 00:00:00';

async function requestErpApi(
  additionalParams: any,
  method: string,
  pageNum: number,
  pageSize: number,
) {
  const postData = {
    appkey: erpAppKey,
    sessionkey: erpSessionKey,
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
  // Post data to the url
  const res = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(postData),
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (res.status !== 200) {
    throw new Error(`Failed to request ERP API: ${res.status}`);
  }
  const json = (await res.json()) as any;
  return json;
}

export async function fetchDeliveries(
  pageSize: number,
  pageNum: number,
  startDateStr: string,
) {
  const method = 'gy.erp.trade.deliverys.get';
  const additionalParams = {
    shop_code: 'Shopify',
    start_modify_date: startDateStr,
    end_modify_date: doomsDayString,
  };
  console.log(`Fetching page ${pageNum}`);
  const json = await requestErpApi(additionalParams, method, pageNum, pageSize);
  return json;
}

export async function fetchStockTransfers(
  pageSize: number,
  pageNum: number,
  startDateStr: string,
) {
  const method = 'gy.erp.stock.transfer.get';
  const additionalParams = {
    start_date: startDateStr,
    end_date: doomsDayString,
  };
  console.log(`Fetching page ${pageNum}`);
  const json = await requestErpApi(additionalParams, method, pageNum, pageSize);
  return json;
}

export async function fetchOrder(orderId: string) {
  const method = 'gy.erp.trade.get';
  const additionalParams = {
    shop_code: 'Shopify',
    code: orderId,
  };
  const json = await requestErpApi(additionalParams, method, 1, 10);
  if (json?.orders?.length > 0) {
    return json.orders[0];
  } else {
    return null;
  }
}

export async function fetchOrders(
  pageSize: number,
  pageNum: number,
  startDateStr: string,
) {
  const method = 'gy.erp.trade.get';
  const additionalParams = {
    shop_code: 'Shopify',
    start_date: startDateStr,
  };
  console.log(`Fetching page ${pageNum}`);
  const json = await requestErpApi(additionalParams, method, pageNum, pageSize);
  return json;
}

export default {
  fetchDeliveries,
  fetchStockTransfers,
  fetchOrders,
  fetchOrder,
};
