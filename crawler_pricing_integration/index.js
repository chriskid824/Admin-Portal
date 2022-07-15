const config = require('./config.js');
const pubsub = require('./pubsub.js');
const firestore = require('./firestore');
const db = require('./db');
const { syncSpu } = require('./syncSpu');

require('dotenv').config();

//Get data by last check time
async function getDataByLastCheckTime(updateTime, updateId) {
  return db.query(
    `SELECT sku_id, unix_timestamp(udt) as udt, lowest_price, lowest_price_express, qty, qty_express, kc_sku 
    FROM du.skus 
    WHERE (udt > FROM_UNIXTIME(${updateTime}) OR (udt = FROM_UNIXTIME(${updateTime}) AND sku_id > ${updateId})) 
    AND sku_status = 1 AND kc_sku <> ''
    ORDER BY udt ASC, sku_id ASC LIMIT 2000`
  );
}

async function getRefDataByTimeRange(start, end, id) {
  return db.query(
    `SELECT sku_id, unix_timestamp(udt) as udt, lowest_price, lowest_price_express, qty, qty_express, kc_sku 
    FROM du.skus 
    WHERE kc_sku in (
      SELECT DISTINCT kc_sku FROM du.skus 
      WHERE (udt > FROM_UNIXTIME(${start}) OR (udt = FROM_UNIXTIME(${start}) AND sku_id > ${id})) 
      AND udt <= FROM_UNIXTIME(${end}) AND sku_status = 1 AND kc_sku <> ''
    )
    AND sku_status = 1 and udt <= FROM_UNIXTIME(${start})
    AND (qty>0 AND lowest_price>10000 OR qty_express>0 AND lowest_price_express>10000)`
  );
}

function getPriceStock(row) {
  let price = 0;
  let qty = 0;
  if (row.lowest_price > 10000 && row.qty > 0) {
    price = row.lowest_price;
    qty = row.qty;
  }
  //Set price and qty if lowest_price and qty don't match
  if (row.lowest_price_express > 10000 && row.qty_express > 0) {
    if (price === 0 || row.lowest_price_express < row.lowest_price) {
      price = row.lowest_price_express;
      qty = row.qty_express;
    }
  }
  return { price, qty };
}

let frequency = 0;
const source = 'du';
async function syncSku() {
  console.log('=== ' + frequency + ' ===');
  frequency += 1;
  const {
    time: lastCheckTime = 0,
    id: lastCheckId = 0
  } = await firestore.getFirestoreLastCheck();
  console.log(lastCheckTime, lastCheckId);
  //Get the data between the last check time and now
  const newUpdate = await getDataByLastCheckTime(lastCheckTime, lastCheckId);
  const updateCount = newUpdate.length;
  if (updateCount > 0) {
    const { udt: newCheckTime, sku_id: newCheckId } = newUpdate[updateCount - 1];
    // get lowest price where qty > 0 for distinct sku
    const distinctSkus = {};
    const refData = await getRefDataByTimeRange(lastCheckTime, newCheckTime, lastCheckId);
    const rows = [...newUpdate, ...refData];
    for (const row of rows) {
      const { kc_sku: sku, udt } = row;
      const { price, qty } = getPriceStock(row);
      if (distinctSkus.hasOwnProperty(sku)) {
        const { price: currPrice, qty: currQty } = distinctSkus[sku];
        if (qty === 0 || currQty > 0 && currPrice < price)
          continue;
      }
      distinctSkus[sku] = { price, qty, udt };
    }

    // update firestore and publish message
    const distinctSkusArr = Object.keys(distinctSkus);
    console.log(`Distinct/DB/Ref: ${distinctSkusArr.length}/${updateCount}/${refData.length}`);
    let msgCount = 0;
    const tasks = distinctSkusArr.map(async (sku) => {
      const { price, qty } = distinctSkus[sku];
      try {
        const { price: currPrice, qty: currQty } = await firestore.getFirestoreDoc(sku);
        if ((price !== currPrice && price > 0) || qty !== currQty) {
          let { udt: timestamp } = distinctSkus[sku];
          timestamp *= 1000; // convert to milliseconds
          const data = JSON.stringify({ sku, source, price, qty, timestamp });
          pubsub.publishMessage('price', data);
          msgCount++;
          // price/qty updated, write to firestore
          firestore.setFirestoreDoc(sku, { price, qty });
        }
      } catch (e) {
        console.error(`[${sku}] price ${price}, qty ${qty}`, e);
        throw e;
      }
    });
    await Promise.all(tasks);
    //Update the last check time
    firestore.updateFirestoreLastCheck({ time: newCheckTime, id: newCheckId });
    console.log(`Distinct/DB: ${distinctSkusArr.length}/${updateCount} | Messages: ${msgCount}`);
  }
}

exports.duCrawler = async (req, res) => {
  // Doing these in serial takes more time but the log is more readable
  await syncSku();
  await syncSpu();
  res.status(200).send();
};
