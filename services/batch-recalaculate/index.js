'use strict';

require('dotenv').config();
const env = process.env;

const Firestore = require('@google-cloud/firestore');
const { GoogleAuth } = require('google-auth-library');
const mysql = require('mysql2/promise');

const shopify = require('./shopify');


// googleauth

const domain = env.PRICE_ENGINE_DOMAIN;
const auth = new GoogleAuth();
let client;

async function requestNexus(path, postData) {
  client = client ?? await auth.getIdTokenClient(domain);
  let data;
  const url = `${domain}/${path}`;
  try {
    const res = await client.request({ url, method: 'POST', data: postData });
    ({ data = null } = res);
  } catch (e) {
    console.error(`[${path}]`, e);
    return null;
  }
  return data;
}


// firestore

const firestore = new Firestore();
const collectionName = 'batchRecalculate';
const docName = 'lastCheck';
const collection = firestore.collection(collectionName);
const docRef = collection.doc(docName);


// db

const databaseConnection = mysql.createPool({
  host: env.DB_HOST ?? 'localhost',
  user: env.DB_USER ?? 'root',
  password: env.DB_PASSWORD ?? '',
  database: env.DB_DATABASE ?? 'test',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function getNextBatch(id, limit) {
  const [rows] = await databaseConnection.query(
    `SELECT sku modelNo, product_id productId
    FROM shopify.product_uploaded 
    WHERE product_id > ? AND status = 'active'
    ORDER BY product_id ASC LIMIT ?`,
    [id, limit]
  );
  return rows;
}

async function getNextBatchBySource(time, sources, limit) {
  const [rows] = await databaseConnection.query(
    `SELECT k.kc_sku sku,
    s.id variantId, s.inventory_item_id inventoryItemId, s.product_id productId
    FROM kickscrew_db2.mgt_price_stock k
    LEFT JOIN shopify.product_variant_uploaded s ON k.kc_sku = s.sku
    WHERE k.udt < FROM_UNIXTIME(?) AND k.source in (?) AND s.id > 0
    ORDER BY k.model_no LIMIT ?`,
    [time, sources, limit]
  );
  return rows;
}

async function updateShopifyDB(table, sku, data) {
  const [ setStr, values ] = Object.keys(data).reduce(([str, v], k) => {
    return [
      `${str}, ${k}=?`,
      [...v, data[k]]
    ];
  }, ['', []]);
  return databaseConnection.query(
    `UPDATE shopify.??
    SET ${setStr.slice(1)}
    WHERE sku = ?`,
    [table, ...values, sku]
  );
}


// main functions

async function batchRecalculateAndSync(rows) {
  // 1. get recalculated price/qty from Nexus
  //    expects `kickscrew_db2.mgt_price_stock.udt` to be updated on successful recalculation
  //    ie. will not return in `getNextBatchBySource` after successful recalculation
  const skus = rows.map(({ sku }) => sku);
  const res = await requestNexus('sku', { skus, skipSync: true });
  // something went wrong, skip and retry later
  if (res === null) return minSleepMS;
  
  const skuMap = {};
  // map results
  for (const data of res.data) {
    if (data === null) {
      continue;
    }
    const { sku } = data;
    skuMap[sku] = data;
  }
  console.log(`valid result count: ${Object.keys(skuMap).length} / ${skus.length}`);
  // something went wrong, skip and retry later
  if (Object.keys(skuMap).length === 0) return minSleepMS;

  // map Shopify ID to SKU
  const variantMap = {};
  const inventoryMap = {};
  for (const row of rows) {
    const { sku, variantId, inventoryItemId, productId } = row;
    if (!skuMap.hasOwnProperty(sku)) {
      console.error(new Error(`[${sku}] no recalculated data`));
      continue;
    }
    Object.assign(skuMap[sku], { sku, variantId, inventoryItemId, productId });
    variantMap[variantId] = inventoryMap[inventoryItemId] = sku;
  }

  // 2. bulk update to Shopify
  const resBody = await shopify.bulkUpdateVariantAndInventory(Object.values(skuMap));
  const { data } = resBody;

  // 3. write updated values to DB and log any discrepancies
  
  // 3.1 check inventory updates
  const { inventoryLevels: inventoryUpdates = [] } = data.inventoryBulkAdjustQuantityAtLocation ?? {};
  for (const update of inventoryUpdates) {
    const { id, available: updatedQty } = update;
    const idStr = id.split('=').pop();
    const inventoryItemId = parseInt(idStr);
    const sku = inventoryMap[inventoryItemId];
    const { qty } = skuMap[sku];
    if (parseInt(qty) !== parseInt(updatedQty)) {
      skuMap[sku].skip = true;
      skuMap[sku].actualQty = updatedQty;
    }
  }
  delete data.inventoryBulkAdjustQuantityAtLocation;

  // 3.2 check variant updates
  for (const productKey in data) {
    const { productVariants } = data[productKey];
    for (const update of productVariants) {
      const { id, price: updatedPrice } = update;
      const idStr = id.split('/').pop();
      const variantId = parseInt(idStr);
      const sku = variantMap[variantId];
      if (!skuMap.hasOwnProperty(sku)) {
        continue;
      }
      const { price } = skuMap[sku];
      if (parseFloat(price) !== parseFloat(updatedPrice)) {
        skuMap[sku].skip = true;
        skuMap[sku].actualPrice = updatedPrice;
      }
    }
  }
  // 3.3 update DB or log discrepancies
  for (const sku in skuMap) {
    const { price, qty, actualPrice, actualQty, skip } = skuMap[sku];
    if (skip) {
      console.error(new Error(`[${sku}] failed to update Shopify (expected / actual) | price: ${price} / ${actualPrice} ; qty: ${qty} / ${actualQty}`));
      continue;
    }
    const updateData = { price, inventory_quantity: qty };
    console.log(`[${sku}] updating to Shopify DB: ${JSON.stringify(updateData)}`)
    updateShopifyDB('product_variant_uploaded', sku, updateData);
  }

  // // 4. calculate sleep time and return
  // const {
  //   maximumAvailable = 0, currentlyAvailable = 0, restoreRate
  // } = resBody.extensions?.cost?.throttleStatus || {};
  // if (currentlyAvailable < maximumAvailable) {
  //   const sleepSec = (maximumAvailable - currentlyAvailable) / restoreRate; // seconds till quota fully restored
  //   const sleepMS = sleepSec * 1000;
  //   return Math.max(sleepMS, minSleepMS);
  // }
  // return minSleepMS;
}

const countPerIteration = env.COUNT_PER_ITERATION ?? 1;
const countPerIterationBySource = env.COUNT_PER_ITERATION_BY_SOURCE ?? 1;
// run recalculate by source for items last updated before this time
// UNIX_TIMESTAMP('2022-04-25 18:00:00') = 1650880800
// items updated after this are expected to have gone through price calculation with
// - deprioritising of China sources, and
// - extra mark up for China sources
const timeBySource = env.TIME_BY_SOURCE ?? 1650880800;
const limitBySource = 142;
const recalculateSources = ['du', 'heiya', 'hy', 'hyo', 'dk'];
const minSleepMS = 100;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));


async function runTriggerRelcaulculateBySources() {
  let runsLeft = countPerIterationBySource;
  while (runsLeft--) {
    // get list of SKUs selling from given sources
    const rows = await getNextBatchBySource(timeBySource, recalculateSources, limitBySource);
    if (rows.length === 0) {
      console.log('no rows found for recalculation');
      return false;
    }
    try {
      await batchRecalculateAndSync(rows);
    } catch (e) {
      const skus = rows.map(({ sku }) => sku);
      console.error(new Error(`error in running batchRecalculateAndSync for ${skus}`));
      throw e;
    }
  }
}

async function runTriggerRecalculate() {
  const doc = await docRef.get();
  let { id = 0 } = doc.exists ? doc.data() : {};
  const rows = await getNextBatch(id, countPerIteration);
  for (const row of rows) {
    console.log(row);
    const { modelNo, productId } = row;
    const data = await requestNexus(`modelNo/${encodeURIComponent(modelNo)}`);
    if (data === null) {
      break;
    }
    id = productId;
    delay(1000);  // sleep 1 second
  }

  await docRef.set({ id });
}

async function getTestRows() {
  const [rows] = await databaseConnection.query(
    `SELECT k.kc_sku sku, UNIX_TIMESTAMP(k.udt) udt,
    s.id variantId, s.inventory_item_id inventoryItemId
    , s.product_id productId
    FROM kickscrew_db2.mgt_price_stock k
    LEFT JOIN shopify.product_variant_uploaded s ON k.kc_sku = s.sku
    WHERE k.model_no in (?)`,
    [['KC-TEST', 'HAHATESTMODELNUMBER', 'HAHATESTEEVEE', 'HAHATESTBATCH1', 'HAHATESTBATCH2', 'HAHATESTBATCH3', 'HAHATESTBATCH-CLOTHES1']]
  );
  return rows;
}

async function test() {
  const start = new Date();
  console.log(start);
  const rows = await getTestRows();
  const startTime = new Date();
  console.log('db query time', startTime - start);
  console.log(startTime);
  const sleepMS = await batchRecalculateAndSync(rows);
  console.log('sleepMS', sleepMS);
  const endTime = new Date();
  console.log(endTime);
  console.log('elapsed:', endTime - startTime);
}


exports.recalculate = async (req, res) => {
  try {
    client = await auth.getIdTokenClient(domain);
    // await runTriggerRecalculate();
    await runTriggerRelcaulculateBySources();
  } catch (e) {
    console.error(e);
    throw e;
  }
  res.status(200).send();
};
