const Sku = require('../sku');
const { query } = require('../db');
const publishMessage = require('../pubsub');

const cl = console.log;

async function isSkuExactlyCorrect(sku) {
  const preferredPromise = sku.getPreferredPriceStock();
  const currentPromise = sku.getCurrentPriceStock();
  const current = (await currentPromise) ?? {};
  const preferred = await preferredPromise;
  const currentPrice = current.price ?? 0;
  const preferredPrice = preferred.price ?? 0;
  const correct = (
    currentPrice === preferredPrice &&
    current.source === preferred.source &&
    current.qty === preferred.qty
  );
  return correct;
}

async function checkSkus(skus, shouldFix = false, shouldCheckExact = false) {
  let incorrectCount = 0;
  await Promise.all(skus.map(async skuRow => {
    const skuNumber = skuRow.sku;
    const sku = await Sku.find(skuNumber);
    let skuIsCorrect = false;
    if (shouldCheckExact) {
      skuIsCorrect = await isSkuExactlyCorrect(sku);
    } else {
      skuIsCorrect = await sku.currentPriceStockIsCorrect();
    }
    if (!skuIsCorrect) {
      incorrectCount++;
      if (shouldFix) {
        const newPriceStock = await sku.forceUpdatePriceStock();
        const { price, qty, source } = newPriceStock;
        if (price !== null) {
          const data = { sku: skuNumber, price, source, forced: true, note: 'fixPrices.js' };
          console.log(`[${skuNumber}][${source}] price-update:`, JSON.stringify(data));
          publishMessage(data, process.env.PUBSUB_PRICE_UPDATE);
        }
        if (qty !== null) {
          const data = { sku: skuNumber, qty, forced: true, note: 'fixPrices.js' };
          console.log(`[${skuNumber}][${source}] stock-update:`, JSON.stringify(data));
          publishMessage(data, process.env.PUBSUB_STOCK_UPDATE);
        }
      }
    }
  }));
  cl(`incorrect count: ${incorrectCount} / ${skus.length}`);
  return incorrectCount > 0;
}

async function checkProduct(product, shouldFix = false) {
  cl(`Checking ${product.model_no}`);
  const skus = await query(`
    SELECT sku FROM sys_stock where product_id = ? && deleted = 0
    `, [product.id]);

  const correct = await checkSkus(skus, shouldFix);
  if (correct) {
    cl(`${product.model_no} is correct`);
  } else {
    cl(`${product.model_no} is incorrect`);
  }
  return correct;
}

async function fetchProducts(page = 0) {
  const pageSize = 100;
  const offset = page * pageSize;
  const products = await query(`
    SELECT model_no, id, name FROM sys_product
    WHERE deleted = 0 && product_type like '%shoe%'
    ORDER BY id DESC
    LIMIT 100
    OFFSET ?
  `, [offset]);
  return products;
}

async function main() {
  const concurrency = 10;
  const queue = new (await import('p-queue')).default({concurrency});
  let total = 0;
  let correct = 0;
  let page = 147;
  while (true) {
    console.log(`Page ${page}`);
    const products = await fetchProducts(page);
    if (products.length === 0) {
      break;
    }
    for (const product of products) {
      await queue.onSizeLessThan(concurrency);
      queue.add(async () => {
        if (await checkProduct(product, true)) {
          correct++;
        }
        total += 1;
        console.log(`Correct: ${correct}/${total}`);
      });
    }
    await queue.onIdle();
    page++;
  }
  await queue.onIdle();
  console.log(`Total Correct: ${correct}/${total}`);
}
// main();

// force recalculate for SKUs selling KC stock with price > 250
// to fix items where $5 is less than 2% after Admin Portal PR #194 update
// https://github.com/KicksCrew/admin-portal/pull/194
async function fixKCPrices() {
  const skus = await query(`
    SELECT kc_sku sku FROM mgt_price_stock
    WHERE price > 250 AND source = 'kc'
  `);

  const correct = await checkSkus(skus, true, true);
}

fixKCPrices();
