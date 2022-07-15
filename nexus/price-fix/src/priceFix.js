const publishMessage = require('./pubsub');
const { query } = require('./db');
const Sku = require('./sku');
const systemStatus = require('./systemStatus');

async function fixSku(skuNumber) {
  const sku = await Sku.find(skuNumber);
  const skuIsCorrect = await sku.currentPriceStockIsCorrect();
  if (!skuIsCorrect) {
    const newPriceStock = await sku.forceUpdatePriceStock();
    const { price, qty, source } = newPriceStock;
    if (price !== null) {
      const data = { sku: skuNumber, price, source, forced: true, note: 'price-fix' };
      console.log(`[${skuNumber}][${source}] price-update:`, JSON.stringify(data));
      publishMessage(data, process.env.PUBSUB_PRICE_UPDATE);
    }
    if (qty !== null) {
      const data = { sku: skuNumber, qty, forced: true, note: 'price-fix' };
      console.log(`[${skuNumber}][${source}] stock-update:`, JSON.stringify(data));
      publishMessage(data, process.env.PUBSUB_STOCK_UPDATE);
    }
  } else {
    // Write to update datastore
    await sku.syncBackToDbIfNeeded();
    console.log(`[${skuNumber}] is correct`);
  }
}

async function enqueueSkusFromProduct(product) {
  console.log(`Checking ${product.model_no}`);
  const skus = await query(`
    SELECT sku FROM sys_stock where product_id = ? && deleted = 0
    `, [product.id]);

  await Promise.all(skus.map(async skuRow => {
    const skuNumber = skuRow.sku;
    if (skuNumber) {
      const data = { sku: skuNumber };
      console.log(`Checking ${skuNumber}`);
      await publishMessage(data, 'price-fix');
    } else {
      console.log(`Skipped ${skuNumber}`);
    }
  }));
}

async function fetchProducts(page = 0) {
  const pageSize = 200;
  const offset = page * pageSize;
  const products = await query(`
    SELECT model_no, id, name FROM sys_product
    WHERE deleted = 0
    ORDER BY id DESC
    LIMIT 200
    OFFSET ?
  `, [offset]);
  return products;
}

async function fetchPageNumber() {
  const page = await systemStatus.get('price-fix-page');
  return page ?? 0;
}

async function savePageNumber(page) {
  await systemStatus.set('price-fix-page', page);
}

async function priceFix(payload) {
  if ('page' in payload) {
    const page = await fetchPageNumber();
    console.log(`Fetching products page ${page}`);
    const products = await fetchProducts(page);

    // XXX: Be careful with publishing message back to the triggering topic
    if (products.length > 0) {
      await savePageNumber(page + 1);
    } else {
      // Go back to the first page after all products are processed
      await savePageNumber(0);
    }

    for (const product of products) {
      await enqueueSkusFromProduct(product);
    }
    console.log(`Finished fetching products page ${page}, ${products.length} products`);
  } else {
    const skuNumber = payload.sku;
    if (!skuNumber) {
      throw new Error('skuNumber not found in Pub/Sub message');
    }
    console.log(`[${skuNumber}] received`);
    await fixSku(skuNumber);
  }
}

module.exports = { priceFix };
