const config = require('./pricing-config');
const firestore = require('./fs');
const db = require('./db');

class SkuDataHandler {
  async find(sku) {
    return firestore.getPriceStock(sku);
  }

  async fetchQtyByWarehouse(sku, warehouse) {
    return db.getQtyByWarehouse(sku, warehouse);
  }

  async fetchIsProductSuspendedBySource(modelNumber, source) {
    return db.getIsProductSuspendedBySource(modelNumber, source);
  }

  async fetchStockDetailBySource(sku, source) {
    return db.getStockDetailBySource(sku, source);
  }

  async fetchFxRateFromCny(currency) {
    return config.getRateFromCNY(currency);
  }

  async fetchFxRateToUsd(currency) {
    return config.getRateToUSD(currency);
  }

  async fetchFreeShippingMarkUpRate() {
    return config.getFreeShippingMarkUpRate();
  }

  async fetchCurrentStockDetail(sku) {
    return db.getCurrentStockDetail(sku);
  }

  async savePriceStockToDb(detail) {
    await db.updateStockDetail(detail);
  }

  async saveToFirestore(sku, doc) {
    return firestore.setPriceStock(sku, doc);
  }

  async fetchProductDetail(sku) {
    return db.getProductDetail(sku);
  }

  isIdTaiwanSuspended(sku) {
    return config.isIdTaiwanSuspended(sku);
  }

  isLargerBox(modelNumber) {
    return config.isLargerBox(modelNumber);
  }

  // This only works for shoes with size code in numbers
  async fetchGoatPrice(modelNumber, variantCode) {
    const store = firestore.firestore;
    const collection = store.collection('goatPrices');

    // Assume model number is all CAP
    // Remove characters from variant code if they are not numbers
    const variantCodeCleaned = variantCode.replace(/[^0-9]/g, '');
    const doc = await collection
      .doc(`${modelNumber}-${variantCodeCleaned}`)
      .get();

    if (doc.exists) {
      return doc.data();
    } else {
      return null;
    }
  }
}

module.exports = SkuDataHandler;
