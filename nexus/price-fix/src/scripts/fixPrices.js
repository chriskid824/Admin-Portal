const Sku = require('../sku');
const { query } = require('../db');
const publishMessage = require('../pubsub');

const cl = console.log;

async function checkProduct(product) {
  cl(`Checking ${product.model_no}`);
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
  const pageSize = 100;
  const offset = page * pageSize;
  const products = await query(`
    SELECT model_no, id, name FROM sys_product
    WHERE deleted = 0
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
  let page = 756;
  while (true) {
    console.log(`Page ${page}`);
    const products = await fetchProducts(page);
    if (products.length === 0) {
      break;
    }
    for (const product of products) {
      await queue.onSizeLessThan(concurrency);
      queue.add(async () => {
        await checkProduct(product, true);
        total += 1;
        console.log(`Total: ${total}`);
      });
    }
    await queue.onIdle();
    page++;
  }
  await queue.onIdle();
  console.log(`Total: ${total}`);
}

async function sourceFormulaUpdated(source) {
  console.log(`Source ${source} updated`);
  let count = 0;
  let page = 13;

  while (true) {
    const pageSize = 1000;
    const offset = page * pageSize;
    console.log(`Page ${page}`);
    const skus = await query(`
      select kc_sku from kickscrew_db2.mgt_price_stock where source = ? LIMIT 1000 OFFSET ?
      `, [source, offset]);

    if (skus.length === 0) {
      break;
    }
    console.log(`Skus: ${skus.length}`);
    page++;

    for (const sku of skus) {
      const data = { sku: sku.kc_sku };
      console.log(`Checking ${sku.kc_sku}, ${count++}`);
      await publishMessage(data, 'price-fix');
      // sleep for 0.25 second
      await new Promise(resolve => setTimeout(resolve, 333));
    }
  }
}
//main();

async function main2() {
  await sourceFormulaUpdated('du');
}
main2();
