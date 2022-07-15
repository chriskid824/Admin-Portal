const Calculator = require('./calculator');
const config = require('./pricing-config');
const firestore = require('./fs');
const cl = console.log;
const publishMessage = require('./pubsub');
const Sku = require('./sku');

async function test() {
  cl('test');
  cl(await config.getRateToUSD('hkd'));
  cl(await config.getRateToUSD('hkd'));
  const d = await firestore.getPriceStock('DJ2636-204-110');
  cl(d);

  const calculator = new Calculator({ sku: 'DJ2636-204-110' });
  const hkmarathon = await calculator.getStockDetailBySource('hkmarathon');
  cl(hkmarathon);
}

async function test2() {
  cl('test2');

  const randomQty = Math.floor(Math.random() * 5);
  const randomPrice = Math.floor(Math.random() * 1000);
  const payload = {
    sku: 'KCS999-80',
    source: 'crewsupply',
    price: randomPrice,
    timestamp: Date.now(),
  };
  const { sku, source, price, qty, timestamp } = payload;
  console.log(`[${sku}][${source}] price: ${price} ; qty: ${qty} ; timestamp: ${timestamp} ; date: ${new Date(timestamp)}`);
  if (sku && source && !(isNaN(price) && isNaN(qty))) {
    const calculator = new Calculator(payload);
    await calculator.init();
    try {
      await calculator.calculateStockDetail();
    } catch (e) {
      console.error(`[${sku}][${source}][ERROR]`, e);
      return;
    }
    const newPrice = calculator.getUpdatedPrice();
    const newQty = calculator.getUpdatedQuantity();
    cl({newPrice, newQty});
  }
  return 'ok';
}

async function test3() {
  const randomQty = Math.floor(Math.random() * 100);
  const randomPrice = Math.floor(Math.random() * 1000);
  const payload = {
    sku: 'H05055-55W',
    isForceUpdate: true,
  };
  const { sku, source, price, qty, timestamp } = payload;
  cl({payload});
  const calculator = new Calculator(payload);
  await calculator.init();
  await calculator.calculateStockDetail();
  const newprice = calculator.getUpdatedPrice();
  const newqty = calculator.getUpdatedQuantity();
  const newsource = calculator.getUpdatedSource();
  cl({ sku, newprice, newqty, newsource });
}

async function testSku() {
  const skuNumber = '0181111231-XXL';
  const sku = await Sku.find(skuNumber);
  const duRaw = await sku.getRawPriceStock('du');
  const du = await sku.getPriceStock('du');
  const preferred = await sku.getPreferredPriceStock();
  cl({duRaw, du, preferred});
}

async function testSku2() {
  const skuNumbers = [
    'GZ1324-35',
    'GZ1324-40',
    'GZ1324-45',
    'GZ1324-50',
    'GZ1324-55',
    'GZ1324-60',
    'GZ1324-65',
    'GZ1324-70',
    'GZ1324-75',
    'GZ1324-80',
    'GZ1324-85',
    'GZ1324-90',
    'GZ1324-95',
    'GZ1324-100',
    'GZ1324-105',
    'GZ1324-110',
    'GZ1324-115',
    'GZ1324-120',
    'GZ1324-125',
    'GZ1324-130',
    'GZ1324-135',
    'GZ1324-140',
    'GZ1324-145',
    'GZ1324-150',
    'GZ1324-155',
    'GZ1324-160',
  ];
  const results = skuNumbers.map(async (sku) => {
    const price = await resync(sku);
    return { sku, price };
  });
  const resolved = await Promise.all(results);
  cl(resolved);
}

async function resync(skuNumber) {
  const sku = await Sku.find(skuNumber);
  cl(await sku.getCurrentPriceStock());
  const preferred = await sku.getPreferredPriceStock();
  return preferred.price;
  const updated = await sku.forceUpdatePriceStock();
  cl(updated);
  await publishMessage({
    sku: sku.sku,
    price: updated.price,
    source: updated.source,
    forced: true,
  }, process.env.PUBSUB_PRICE_UPDATE);
  await publishMessage({
    sku: sku.sku,
    qty: updated.qty,
    forced: true,
  }, process.env.PUBSUB_STOCK_UPDATE);
  //cl(sku.dbSourceCache);
  cl('Done');
  return updated.price;
}

async function test3() {
  const sku = await Sku.find('TEST-TRYAGAIN-F');
  await sku.forceUpdatePriceStock();
  await sku.syncBackToDbIfNeeded();
}

test3();
