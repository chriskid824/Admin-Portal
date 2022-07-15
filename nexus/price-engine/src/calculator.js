const Sku = require('./sku');
const publishMessage = require('./pubsub');

const shouldDoubleCheck = process.env.DOUBLE_CHECK_ENABLED === 'true' || false;

class Calculator {
  constructor(skuNumber) {
    this.skuNumber = skuNumber;
    this.payload = {};
  }

  async getSku() {
    if (!this.sku) {
      this.sku = await Sku.find(this.skuNumber);
    }
    return this.sku;
  }

  async sourceHasUpdated(payload) {
    const source = payload.source;
    const sku = await this.getSku();
    const cached = await sku.getCachedPriceStock(source);

    this.log(`Cached: ${JSON.stringify(cached)}`);

    if (!cached) {
      return true;
    }
    const oldTimestamp = cached.timestamp ?? 0;
    const newTimestamp = payload.timestamp;

    // 1 seconds leeway for timestamp in case the price and stock messages
    // have slightly different timestamps.
    let updated = newTimestamp >= oldTimestamp - 1000;

    if (updated) {
      const priceChanged = ('price' in payload) && payload.price !== cached.price;
      const qtyChanged = ('qty' in payload) && payload.qty !== cached.qty;
      if (!priceChanged && !qtyChanged) {
        updated = false;
      }
    }

    return updated;
  }

  async publishNewPriceStock(newPriceStock) {
    if (newPriceStock) {
      const sku = this.skuNumber;
      const { source, price, qty } = newPriceStock;
      this.log(`Publishing new price stock: ${JSON.stringify(newPriceStock)}`);
      if ('price' in newPriceStock) {
        // Price must come with source
        const data = { sku, price, source };
        this.log(`price-update:`, JSON.stringify(data));
        publishMessage(data, process.env.PUBSUB_PRICE_UPDATE);
      }
      if ('qty' in newPriceStock) {
        const data = { sku, qty };
        this.log(`stock-update:`, JSON.stringify(data));
        publishMessage(data, process.env.PUBSUB_STOCK_UPDATE);
      }
    }
  }

  async updateWith(payload) {
    if (!('source' in payload)) {
      throw new Error(`Source not found in payload`);
    }
    const source = payload.source;
    if (!Sku.isValidSource(source)) {
      this.log(`Source ${source} is not valid. Skipping.`);
      return;
    }

    this.payload = payload;
    const needToProcess = await this.sourceHasUpdated(payload);
    if (needToProcess) {
      this.log(`Source ${source} has updated. Processing.`);
      const sku = await this.getSku();
      sku.setCachedPriceStock(source, payload);
      const newPriceStock = await sku.updatePriceStockIfNeeded();
      if (Object.keys(newPriceStock).length === 0) {
        this.log(`Current price stock is correct. Skipping.`);
      } else {
        this.log(`Current price stock is updated.`);
        // Skip await
        this.publishNewPriceStock(newPriceStock);
      }
      await sku.saveCachedPriceStock();
    } else {
      this.log(`No change. Not updating`);
      // TODO: Need to update timestamp if it has changed
    }
    if (shouldDoubleCheck && Math.random() < 0.1) {
      const checkingSku = await Sku.find(this.skuNumber);
      if (await checkingSku.currentPriceStockIsCorrect()) {
        this.log(`Doublecheck - Updated price stock is correct.`);
      } else {
        this.log(`Doublecheck - Updated price stock is not correct.`);
      }
    }
  }

  log() {
    const sku = this.skuNumber;
    const { source, price, qty } = this.payload;
    console.log(`[${sku}][${source}][${price}][${qty}]`, ...arguments);
  }
}

module.exports = Calculator;
