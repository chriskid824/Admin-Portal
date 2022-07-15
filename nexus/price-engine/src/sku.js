const assert = require('assert');

const SkuDataHandler = require('./skuDataHandler');
const { objAssign: assign } = require('./util');
const config = require('./config');

const ALL_SOURCES = [
  'kc',
  'con',
  'du',
  'heiya',
  'id',
  'af',
  'snkrdunk',
  'hkmarathon',
  'crewsupply',
  'hkfootlocker',
];

// These are the sources that are persisted to firestore instead of MySQL.
const FIRESTORE_PERSISTED_SOURCES = [
  'hkmarathon',
  'crewsupply',
  'hkfootlocker',
];

const LOW_PRIORITY_SOURCES = [];

// What is this?
const SHIPPING_QTY = 50;

// If a source has price less than this, it is considered as out of stock.
const PRICE_THRESHOLD = 10;

// This is used to prevent over selling due to selling to multiple channels.
const MAX_SUPPLY_QTY = 5;

const PRICE_DIFF_THRESHOLD = 0.01;

class Sku {
  constructor(sku, firestoreDoc = {}, dataHandler) {
    // Check sku must be a string
    if (typeof sku !== 'string') {
      throw new Error('sku must be a string');
    }
    this.sku = sku.toUpperCase();

    const splitedSku = this.sku.split('-');
    this.variantCode = splitedSku.pop();
    this.modelNumber = splitedSku.join('-');

    // The firestore document of price and stock
    this.firestoreDoc = firestoreDoc;

    this.dbSourceCache = {};
    this.currentPriceStock = null;
    if (dataHandler) {
      this.dataHandler = dataHandler;
    } else {
      this.dataHandler = new SkuDataHandler();
    }
    this.toMerge = {};

    // Additional information other than price sources
    this.additionalInfo = {};
  }

  static async find(sku, dataHandler) {
    if (typeof sku !== 'string') {
      throw new Error('sku must be a string');
    }
    const upperCasedSku = sku.toUpperCase();

    // Name seems too generic. Should be named `remoteDataHandler`?
    if (!dataHandler) {
      dataHandler = new SkuDataHandler();
    }
    const doc = await dataHandler.find(upperCasedSku);
    const ret = new Sku(upperCasedSku, doc || {}, dataHandler);

    // Set additional properties
    try {
      if (config.goatPricingEnabled) {
        ret.additionalInfo.goat = await dataHandler.fetchGoatPrice(
          ret.modelNumber,
          ret.variantCode,
        );
      }
    } catch (e) {
      console.log(`Failed to fetch GOAT's price: ${e}`, sku);
    }

    return ret;
  }

  static isValidSource(source) {
    return ALL_SOURCES.includes(source);
  }

  async sourceIsSuspended(source) {
    switch (source) {
      case 'id':
        return this.dataHandler.isIdTaiwanSuspended(this.sku);
      case 'af':
      case 'hkmarathon':
      case 'snkrdunk':
      case 'crewsupply':
      case 'hkfootlocker':
        return false;
      default:
        return this.dataHandler.fetchIsProductSuspendedBySource(
          this.modelNumber,
          source,
        );
    }
  }

  async getRawPriceStock(source) {
    if (FIRESTORE_PERSISTED_SOURCES.includes(source)) {
      return this.firestoreDoc[source] ?? null;
    } else {
      if (!(source in this.dbSourceCache)) {
        const priceStock = await this.dataHandler.fetchStockDetailBySource(
          this.sku,
          source,
        );
        if (priceStock) {
          priceStock.isSuspended = await this.sourceIsSuspended(source);
        }
        this.dbSourceCache[source] = priceStock;
      }
      return this.dbSourceCache[source];
    }
  }

  getCachedPriceStock(source) {
    if (source in this.firestoreDoc) {
      return this.firestoreDoc[source];
    } else {
      return null;
    }
  }

  setCachedPriceStock(source, priceStock) {
    const defaultPriceStock = {
      price: 0,
      qty: 0,
      timestamp: 0,
    };
    const currentPriceStock = this.getCachedPriceStock(source);
    const newPriceStock = assign(
      defaultPriceStock,
      currentPriceStock ?? {},
      priceStock,
    );
    this.firestoreDoc[source] = newPriceStock;
    const clone = Object.assign({}, priceStock);
    delete clone.sku;
    this.toMerge[source] = clone;
  }

  async saveCachedPriceStock() {
    // Skip if this.toMerge is empty
    if (Object.keys(this.toMerge).length !== 0) {
      this.log('Saving cached price stock:', JSON.stringify(this.toMerge));
      await this.dataHandler.saveToFirestore(this.sku, this.toMerge);
      this.toMerge = {};
    }
  }

  getMaxQty(source) {
    switch (source) {
      case 'id':
      case 'af':
        return 3;
      case 'du':
      case 'snkrdunk':
      case 'hkmarathon':
      case 'hkfootlocker':
        return 20;
      case 'crewsupply':
        return 100;
    }
    return MAX_SUPPLY_QTY;
  }

  // The calculated mark up rate when sold from a specific source
  // This returns null if source is suspended.
  async getPriceStock(source) {
    const rateCnyUsd = await this.dataHandler.fetchFxRateFromCny('usd');
    const rateHkdUsd = await this.dataHandler.fetchFxRateToUsd('hkd');
    const raw = await this.getRawPriceStock(source);
    if (!raw || raw.isSuspended) {
      return null;
    }
    let price, qty, costPrice;
    switch (source) {
      // KC
      case 'kc':
        ({ price, qty } = raw);
        costPrice = price;
        price += 5;
        break;

      // Consign
      case 'con':
        ({ price_USD: price, qty } = raw);
        costPrice = price;
        break;

      // DU
      case 'du':
        ({ lowest_price: price, qty } = raw);
        let { lowest_price_express: priceExpress, qty_express: qtyExpress } =
          raw;
        if ((price > priceExpress && priceExpress >= 10000) || price < 10000) {
          price = priceExpress;
          qty = qtyExpress;
        }
        costPrice = Math.round(price / 100);
        // 2022-04-07 temp fix, hardcoded to 20
        if (qty > 0) {
          qty = 20;
        }
        if (price <= 50000) {
          price += 10000;
        } else if (price <= 70000) {
          price += 5000;
        }
        price = ((price / 100) * 1.22 + 100) * 1.03;
        price = Math.ceil(price * rateCnyUsd) + 5;
        break;

      // 平野 Heiya
      case 'heiya':
        ({ price_ori: price, quantity: qty } = raw);
        costPrice = price;
        price = Math.ceil(price * rateCnyUsd * 1.22 + 15);
        break;

      // ID Taiwan
      // AF Taiwan
      case 'id':
      case 'af':
        ({ price, qty } = raw);
        costPrice = price;
        price = Math.ceil(price * 1.22) + 20;
        break;

      // SNKRDUNK
      case 'snkrdunk':
        const rateJpyUsd = await this.dataHandler.fetchFxRateToUsd('jpy');
        // qty = 3; // no qty value stored in db, hardcoded to 3
        qty = 20; // 2022-04-07 temp fix, hardcoded to 20
        ({ price } = raw);
        costPrice = price;
        price = Math.ceil((price * rateJpyUsd * 1.07 + 10) * 1.22) + 5;
        break;

      case 'hkmarathon':
        ({ price, qty } = raw);
        // Shipping fee
        if (price < 700) {
          price += 50;
        }
        costPrice = price;
        price = Math.ceil(price * rateHkdUsd * 1.22) + 5;
        break;

      case 'hkfootlocker':
        ({ price, qty } = raw);
        costPrice = price;
        price = Math.ceil(price * rateHkdUsd * 1.22) + 5;
        break;

      case 'crewsupply':
        ({ price, qty } = raw);
        costPrice = price;
        break;

      default:
        return null;
    }

    // Data rectification to handle edge cases
    if (!price || price < PRICE_THRESHOLD) {
      price = 0;
      qty = Math.min(qty, 0);
    }
    if (!qty) {
      qty = 0;
    }
    if (!costPrice) {
      costPrice = 0;
    }

    // What is this?
    if (this.modelNumber === 'SHIPPING') {
      qty = SHIPPING_QTY;
    } else {
      qty = Math.min(qty, this.getMaxQty(source));
      if (price) {
        price += await this.getExtraMarkUpRate();
      }
    }

    if (qty <= 0) {
      return null;
    }

    return { price, qty, costPrice, source };
  }

  async isFreeShipping() {
    // TODO:
    // Looks like there's no free shipping product for now, so it's
    // ok to skip this check.
    // SELECT * FROM sys_r_category_product WHERE category_id = 20 limit 100;
    return false;
  }

  isLargerBox() {
    return this.dataHandler.isLargerBox(this.modelNumber);
  }

  async getExtraMarkUpRate() {
    let markup = 0;

    if (await this.isFreeShipping()) {
      markup += await this.dataHandler.fetchFreeShippingMarkUpRate();
    }

    if (this.isLargerBox()) {
      const largerBoxShipping = 10;
      markup += largerBoxShipping;
    }
    return markup;
  }

  async getOversoldQty() {
    // source=kc negative qty indicates oversold qty
    const kcPriceStock = await this.getRawPriceStock('kc');
    return kcPriceStock?.qty ?? 0;
  }

  // Compare price stock a and b, return the one with some qty and lower price
  // Note: consider moving this out of this class
  betterPriceStock(a, b) {
    const sellable = (source) => {
      return source && source.qty > 0 && source.price > 0;
    };
    if (sellable(a)) {
      if (sellable(b)) {
        if (a.price < b.price) {
          return a;
        } else {
          return b;
        }
      } else {
        return a;
      }
    } else {
      if (sellable(b)) {
        return b;
      } else {
        return null;
      }
    }
  }

  // Recalculate the price and qty of the product
  async getPreferredPriceStock() {
    const tasks = ALL_SOURCES.map((source) => this.getPriceStock(source));
    const results = await Promise.all(tasks);
    const oversoldQty = await this.getOversoldQty();
    let oversoldBy = oversoldQty < 0 ? -oversoldQty : 0;

    // sort by priority list (whether or not is in `LOW_PRIORITY_SOURCES`), then by price
    const validSources = results.filter((detail) => !!detail);
    validSources.sort(
      ({ price: a = 0, source: sa }, { price: b = 0, source: sb }) => {
        if (LOW_PRIORITY_SOURCES.includes(sa)) {
          if (!LOW_PRIORITY_SOURCES.includes(sb)) {
            return 1;
          }
        } else if (LOW_PRIORITY_SOURCES.includes(sb)) {
          return -1;
        }
        return a - b;
      },
    );

    const stockDetail = validSources.find((current) => {
      const { price, qty } = current;
      if (!price || qty < 1) {
        return false;
      }

      // Special case for crewsupply
      if (current.source === 'crewsupply') {
        oversoldBy = 0;
        return true;
      }

      if (oversoldBy < qty) {
        return true;
      }
      oversoldBy -= qty;
      return false;
    });

    if (!stockDetail) {
      // We don't have any stock for this product
      return {
        price: 0,
        costPrice: 0,
        qty: 0,
        source: '',
      };
    }
    const { qty } = stockDetail;
    const clone = Object.assign({}, stockDetail);
    clone.qty = qty - oversoldBy;

    // Check against GOAT's price
    // Increase price to match 90% of GOAT's price
    const goatPrice = this.getGoatPrice(true);
    if (goatPrice) {
      const goatPrice90 = Math.ceil(goatPrice * 0.9);
      if (clone.price && clone.price < goatPrice90) {
        // eslint-disable-next-line prettier/prettier
        this.log(`Adjusting price from ${clone.price} to ${goatPrice90} to match GOAT's price ${goatPrice}.`);
        clone.price = goatPrice90;
      } else {
        this.log(`GOAT's price is lower: ${clone.price}`);
      }
    }

    return clone;
  }

  // Get the current price stock of the SKU which is calculated last time and
  // stored in the database.
  async getCurrentPriceStock() {
    if (!this.currentPriceStock) {
      const firestoreCurrent = this.firestoreDoc._calculated || null;
      if (firestoreCurrent && Object.keys(firestoreCurrent).length > 0) {
        this.currentPriceStock = firestoreCurrent;
      } else {
        //this.log('current stock detail not found in firestore ... querying db');
        // Find it in mgt_price_stock
        const sku = this.sku;
        const dbCurrent = await this.dataHandler.fetchCurrentStockDetail(sku);
        if (dbCurrent) {
          dbCurrent.costPrice = dbCurrent.cost_price;
          delete dbCurrent.cost_price;
          this.currentPriceStock = dbCurrent;
        } else {
          // no record yet in `mgt_price_stock`
          // Try to find it in sys_stock
          const dbProductDetail = await this.dataHandler.fetchProductDetail(sku);
          this.currentPriceStock = dbProductDetail;
        }
      }
    }
    return this.currentPriceStock;
  }

  async currentPriceStockIsCorrect() {
    const preferredPromise = this.getPreferredPriceStock();
    const currentPromise = this.getCurrentPriceStock();
    const current = await currentPromise;
    this.log(`current: ${JSON.stringify(current)}`);
    if (!current) {
      return true;
    }
    const preferred = await preferredPromise;
    this.log(`preferred: ${JSON.stringify(preferred)}`);

    let correct = true;
    if (current.price !== undefined && current.price !== preferred.price) {
      const diff = Math.abs(current.price - preferred.price);
      if (diff > current.price * PRICE_DIFF_THRESHOLD) {
        if (diff > current.price * PRICE_DIFF_THRESHOLD * 3) {
          this.log(
            'current price is not correct (current, preferred)',
            current.price,
            preferred.price,
          );
        } else {
          this.log(
            'current price needs adjustment (current, preferred)',
            current.price,
            preferred.price,
          );
        }
        correct = false;
      }
    }
    if (current.qty !== undefined && current.qty !== preferred.qty) {
      this.log(
        'current qty is not correct (current, preferred)',
        current.qty,
        preferred.qty,
      );
      correct = false;
    }
    return correct;
  }

  /**
   * Recalculate the price and qty of the product using the source data,
   * then only update each of them only if changed.
   * @returns {Object} the changed fields.
   **/
  async updatePriceStockIfNeeded() {
    this.log('Update price stock if needed');
    const preferredPromise = this.getPreferredPriceStock();
    const currentPromise = this.getCurrentPriceStock();
    const current = (await currentPromise) ?? {};
    this.log(`current: ${JSON.stringify(current)}`);

    const preferred = await preferredPromise;
    this.log(`preferred: ${JSON.stringify(preferred)}`);

    assert(preferred, 'Preferred price stock should not be null');
    const updatedObject = {};

    const currentPrice = current.price ?? 0;
    const preferredPrice = preferred.price ?? 0;
    const diff = Math.abs(currentPrice - preferredPrice);
    if (
      diff > currentPrice * PRICE_DIFF_THRESHOLD ||
      current.source !== preferred.source
    ) {
      updatedObject.price = preferred.price;
      updatedObject.source = preferred.source;
    }
    if (current.qty !== preferred.qty) {
      updatedObject.qty = preferred.qty;
    }

    // Persistence
    if (Object.keys(updatedObject).length > 0) {
      // DB
      const dbData = assign({
        sku: this.sku,
        model_no: this.modelNumber,
      }, current, preferred);
      try {
        await this.dataHandler.savePriceStockToDb(dbData);
      } catch (e) {
        this.warn(
          `${e.code} error in updating mgt_price_stock, retry once before requeuing message |`,
          e,
        );
        await this.dataHandler.savePriceStockToDb(dbData);
      }
      // Firestore
      await this.saveUpdatedCurrent(updatedObject);
    }

    return updatedObject;
  }

  // Saves perferred price stock as _calculated to firestore. Also piggy back
  // this.toMerge to save a potential round trip. Supports partial update.
  async saveUpdatedCurrent(updatedCurrent) {
    if (Object.keys(updatedCurrent).length > 0) {
      // Save to firestore
      const clone = Object.assign({}, updatedCurrent);
      if (clone) {
        clone.meta = {
          processor: 'price-engine',
          version: '1.0.1',
          processedAt: new Date(),
        };
      }
      const firestoreData = Object.assign(this.toMerge, {
        _calculated: clone,
      });
      this.log('save to firestore:', JSON.stringify(firestoreData));
      await this.dataHandler.saveToFirestore(this.sku, firestoreData);
      this.toMerge = {};
    }
  }

  async forceUpdatePriceStock() {
    this.log('Force update price stock');
    const preferredPriceStock = await this.getPreferredPriceStock();
    assert(preferredPriceStock, 'Preferred price stock is null');

    // Save to DB
    const current = await this.getCurrentPriceStock();
    this.log('current:', JSON.stringify(current));
    this.log('update: ', JSON.stringify(preferredPriceStock));
    const dbData = assign({
      sku: this.sku,
      model_no: this.modelNumber,
    }, current, preferredPriceStock);
    try {
      await this.dataHandler.savePriceStockToDb(dbData);
    } catch (e) {
      this.warn(
        `${e.code} error in updating mgt_price_stock, retry once before requeuing message |`,
        e,
      );
      await this.dataHandler.savePriceStockToDb(dbData);
    }
    await this.saveUpdatedCurrent(preferredPriceStock);

    // Should we update this.currentPriceStock?
    return preferredPriceStock;
  }

  // Sync the firestore current back to the db if existed.
  async syncBackToDbIfNeeded() {
    const firestoreCurrent = this.firestoreDoc._calculated || null;
    if (firestoreCurrent && Object.keys(firestoreCurrent).length > 0) {
      const current = await this.firestoreDoc._calculated;
      this.log('Sync firestore _calculated back to db');
      const dbData = assign({
        sku: this.sku,
        model_no: this.modelNumber
      }, current);
      await this.dataHandler.savePriceStockToDb(dbData);
    } else {
      this.log('No firestore current found. Skip sync.');
    }
  }

  warn() {
    const sku = this.sku;
    console.warn(`[${sku}][undefined][undefined][undefined]`, ...arguments);
  }

  log() {
    const sku = this.sku;
    console.log(`[${sku}][undefined][undefined][undefined]`, ...arguments);
  }

  getGoatPrice(onlyTopModel = false) {
    const goat = this.additionalInfo.goat;

    if (!goat) {
      return null;
    }
    // Return null if this is too old.
    const aWeekInSeconds = 60 * 60 * 24 * 7;
    if ((goat.updatedAt?.seconds ?? 0) < Date.now() / 1000 - aWeekInSeconds) {
      return null;
    }
    if (onlyTopModel && !goat.isTopModel) {
      return null;
    }
    const priceCents = goat.lowestPriceCents?.amount ?? null;
    if (!priceCents) {
      return null;
    }
    // If price cents is not type of number
    if (typeof priceCents !== 'number') {
      return null;
    }
    return priceCents / 100;
  }
}

module.exports = Sku;
