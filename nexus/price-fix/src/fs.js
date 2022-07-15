const { Firestore, Timestamp } = require('@google-cloud/firestore');

const priceStockPath = process.env.FS_PRICE_STOCK_NAME ?? 'price_stock';

const store = new Firestore();
const priceStock = store.collection(priceStockPath);

function toTimestamp(date) {
  return Timestamp.fromDate(new Date(date));
}

function cleanDocAddress(add) {
  return add.replace(/\//g, '_FS_SLASH_');
}

async function read(coll, add) {
  const cleaned = cleanDocAddress(add);
  const doc = await coll.doc(cleaned).get();
  return doc.exists ? doc.data() : {};
}

async function write(coll, add, data) {
  const cleaned = cleanDocAddress(add);
  return coll.doc(cleaned).set(data, { merge: true });
}

async function getPriceStock(sku) {
  return read(priceStock, sku);
}

async function getPriceStockByModelNumber(modelNo) {
  // TODO : possible to not hardcode `_calculated`?
  const snapshot = await priceStock
    .where('_calculated.model_no', '==', modelNo)
    .get();
  if (snapshot.empty) {
    return [];
  }
  const data = [];
  snapshot.forEach((doc) => data.push(doc.data()));
  return data;
}

async function setPriceStock(sku, data) {
  return write(priceStock, sku, data);
}

module.exports = {
  getPriceStock,
  getPriceStockByModelNumber,
  setPriceStock,
  toTimestamp,
  firestore: store,
};
