import fetch from 'node-fetch';
import systemStatus from './systemStatus';
import dotenv from 'dotenv';

import erp from './erp';

dotenv.config();

// Return date as string in "YYYY-MM-DD HH:MM:SS" format in UTC+8 timezone
function formatDate(date: Date) {
  const d = new Date(date);
  d.setHours(d.getHours() + 8);
  return d.toISOString().slice(0, 19).replace('T', ' ').replace('Z', '');
}

async function updateOrderStatus(
  orderNumber: string,
  type: string,
  datetime: number | string,
) {
  console.log(`Updating order ${orderNumber} to ${type}`, datetime);
  const host = process.env.OSS_HOST;
  const token = process.env.OSS_TOKEN;
  const url = `${host}/v1/order/${orderNumber}/status`;
  const tokenParam = `?token=${token}`;
  console.log(`Update order status: ${url}`);
  const res = await fetch(url + tokenParam, {
    method: 'POST',
    body: JSON.stringify({ type, datetime }),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (res.status !== 200) {
    throw new Error(`Failed to update order ${orderNumber}: ${res.status}`);
  }
}

async function processDelivery(delivery: any) {
  if (delivery.cancel) {
    return;
  }

  const d = delivery;
  console.log({
    platform_code: d.platform_code,
    create_date: d.create_date,
    modify_date: d.modify_date,
    delivery_date: d.delivery_statusInfo.delivery_date,
    warehouse_name: d.warehouse_name,
    warehouse_code: d.warehouse_code,
  });
  if (!d.platform_code) {
    console.error('Missing platform_code');
    return;
  }

  if (d.warehouse_name) {
    await updateOrderStatus(d.platform_code, 'kickscrew-received', Date.now());
  } else {
    console.log('No stock received yet.');
  }
}

export async function syncDeliveries() {
  // Get last delivery date from database
  let startDateStr = await systemStatus.get('erpConnectorLastModified');
  if (!startDateStr) {
    const msPerMinute = 60 * 1000;
    const dateTenMinutesAgo = new Date(Date.now() - msPerMinute * 10);
    startDateStr = formatDate(dateTenMinutesAgo);
  }
  console.log(`Start date: ${startDateStr}`);

  let lastModified = '';

  let pageNum = 0;
  const pageSize = 20;
  let totalPage = 1;
  while (pageNum < totalPage) {
    pageNum++;
    const json = await erp.fetchDeliveries(pageSize, pageNum, startDateStr);

    if (json['success']) {
      if (json.deliverys) {
        const promises: Promise<void>[] = [];
        for (const delivery of json.deliverys) {
          promises.push(processDelivery(delivery));
          if (delivery.modify_date > lastModified) {
            lastModified = delivery.modify_date;
          }
        }
        await Promise.all(promises);
      } else {
        throw new Error('No deliverys found');
      }
      if (totalPage == 1) {
        totalPage = Math.ceil(json['total'] / pageSize);
      }
    } else {
      console.error(json);
      throw new Error(`JSON returns failed`);
    }
  }
  console.log(`Last modified: ${lastModified}`);
  // Save lastModified to database
  await systemStatus.set('erpConnectorLastModified', lastModified);
}

async function fetchOrderNumber(item: any): Promise<string | null> {
  try {
    const note: string = (item.note ?? '').trim();
    // Pattern match order number in the note
    const pattern = /[A-Z]{2}[0-9]{10,14}/;
    // Find the first match
    const match = note.match(pattern);

    if (match) {
      const code = match[0];
      const order = await erp.fetchOrder(code);
      return order?.platform_code;
    } else {
      return null;
    }
  } catch (e) {
    console.error(e);
  }
  return null;
}

async function processStockTransfer(stockTransfer: any) {
  console.log('Processing stock transfer:', stockTransfer.code);
  // TODO: Check in/out warehouse
  const modifyDate = new Date(`${stockTransfer.modify_date}+0800`);
  for (const item of stockTransfer.details) {
    const orderNumber = await fetchOrderNumber(item);
    console.log({
      note: item.note,
      orderNumber,
    });
    if (orderNumber) {
      await updateOrderStatus(
        orderNumber,
        'kickscrew-transferring',
        modifyDate.getTime() / 1000,
      );
    }
  }
}

export async function syncStockTransfers() {
  // Get last delivery date from database
  let startDateStr = await systemStatus.get(
    'erpConnectorStockTransferLastModified',
  );
  if (!startDateStr) {
    const msPerMinute = 60 * 1000;
    const dateTenMinutesAgo = new Date(Date.now() - msPerMinute * 10);
    startDateStr = formatDate(dateTenMinutesAgo);
  }
  console.log(`Start date: ${startDateStr}`);

  let lastModified = '';
  let pageNum = 0;
  const pageSize = 20;
  let totalPage = 1;
  while (pageNum < totalPage) {
    pageNum++;
    const json = await erp.fetchStockTransfers(pageSize, pageNum, startDateStr);

    if (json['success']) {
      if (json.stockTransfers) {
        const promises: Promise<void>[] = [];
        for (const transfer of json.stockTransfers) {
          promises.push(processStockTransfer(transfer));
          if (transfer.modify_date > lastModified) {
            lastModified = transfer.modify_date;
          }
        }
        await Promise.all(promises);
      } else {
        throw new Error('No stock transfers found');
      }
      if (totalPage == 1) {
        totalPage = Math.ceil(json['total'] / pageSize);
      }
    } else {
      console.error(json);
      throw new Error(`JSON returns failed`);
    }
  }
  console.log(`Last stock transfer modified: ${lastModified}`);
  await systemStatus.set('erpConnectorStockTransferLastModified', lastModified);
}

export async function syncFromErpHttp(req, res) {
  await syncDeliveries();
  await syncStockTransfers();
  res.status(200).send();
}
