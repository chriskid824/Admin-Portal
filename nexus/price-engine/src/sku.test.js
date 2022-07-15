const _ = require('lodash');

const Sku = require('./sku');

const localStore = {
  'TEST-SKU-SIZE': {
    _calculated: {
      price: 133.7,
      qty: 7,
      costPrice: 133.7,
      source: 'crewsupply',
    },
    crewsupply: {
      price: 133.7,
      qty: 7,
      timestamp: 1000000,
    },
    hkmarathon: {},
    du: {
      id: 28923851,
      lowest_price: 161900,
      qty: 3,
      kc_sku: 'TEST-SKU-SIZE',
      lowest_price_express: 0,
      qty_express: 0,
    },
    kc: {
      timestamp: 100 * 1000,
      erpsku: 'ERPTEST-SKU-SIZE',
      qty: 22,
    },
  },
  'TEST-SKU2-SIZE': {
    crewsupply: {},
    hkmarathon: {
      price: 200.7,
      qty: 7,
      timestamp: 1000000,
    },
    du: {
      id: 28923851,
      lowest_price: 161900,
      qty: 3,
      kc_sku: 'TEST-SKU-SIZE2',
      lowest_price_express: 0,
      qty_express: 0,
    },
    kc: {
      erpsku: 'ERPTEST-SKU2-SIZE',
      qty: -16,
    },
  },
  'TEST-SKU3-SIZE': {
    hkfootlocker: {
      price: 300,
      qty: 7,
      timestamp: 1000000,
    },
    hkmarathon: {
      price: 20.7,
      qty: 9,
      timestamp: 1000000,
    },
    du: {
      id: 28923851,
      lowest_price: 161900,
      qty: 3,
      kc_sku: 'TEST-SKU-SIZE3',
      lowest_price_express: 0,
      qty_express: 0,
    },
    kc: {
      erpsku: 'ERPTEST-SKU3-SIZE',
      qty: -36,
    },
  },
  'TEST-SKU4-SIZE': {
    crewsupply: {
      price: 100,
      qty: 3,
      timestamp: 1000000,
    },
    hkmarathon: {
      price: 1000,
      qty: 5,
      timestamp: 1000000,
    },
    kc: {
      qty: -4,
    },
  },
  'TEST-SKU5-SIZE': {
    crewsupply: {
      price: 100,
      qty: 3,
      timestamp: 1000000,
    },
    hkmarathon: {
      price: 1000,
      qty: 10,
      timestamp: 1000000,
    },
    kc: {
      qty: -40,
    },
  },
  'SKU-NEED-UPDATE-SIZE': {
    _calculated: {
      price: 100,
      qty: 7,
      source: 'crewsupply',
    },
    kc: {
      price: 2000,
      qty: 3,
    },
  },
  'SKU-PARTIAL-UPDATE-SIZE': {
    _calculated: {
      price: 100,
      qty: 4,
      source: 'kc',
    },
    kc: {
      price: 2000,
      qty: 4,
    },
  },
  'SKU-OVERSOLD-SIZE': {
    _calculated: {
      price: 1591,
      qty: 1,
      source: 'hkmarathon',
    },
    hkmarathon: {
      price: 10000,
      qty: 5,
    },
    kc: {
      price: 2000,
      qty: -4,
    },
  },
  'STABLE_MOBEL-SIZE': {
    _calculated: {
      price: 133.7,
      qty: 7,
      costPrice: 133.7,
      source: 'crewsupply',
    },
    crewsupply: {
      price: 133.7,
      qty: 7,
      timestamp: 1000000,
    },
  },
};

const warehouseQty = {
  'ERPTEST-SKU-SIZE': {
    FR: 5,
    DK: 2,
  },
  'ERPTEST-SKU2-SIZE': {
    FR: 1,
    DK: 3,
  },
  'ERPTEST-SKU3-SIZE': {
    FR: 0,
    DK: 2,
  },
};

class SkuDataHandlerStub {
  async find(sku) {
    return _.cloneDeep(localStore[sku] ?? null);
  }

  async fetchQtyByWarehouse(sku, warehouse) {
    return warehouseQty[sku]?.[warehouse] ?? 0;
  }

  async fetchIsProductSuspendedBySource(modelNumber, source) {
    return false;
  }

  async fetchStockDetailBySource(sku, source) {
    // This is in the mysql db in the real world.
    return _.cloneDeep(localStore[sku]?.[source] ?? null);
  }

  async fetchFxRateFromCny(currency) {
    if (currency === 'cny') {
      return 1.0;
    } else if (currency === 'usd') {
      return 0.15;
    }
    throw new Error(`unsupported currency: ${currency}`);
  }

  async fetchFxRateToUsd(currency) {
    if (currency === 'cny') {
      return 6.5;
    } else if (currency === 'usd') {
      return 1.0;
    } else if (currency === 'hkd') {
      return 0.13;
    }
    throw new Error(`unsupported currency: ${currency}`);
  }

  async fetchFreeShippingMarkUpRate() {
    return 0;
  }

  async savePriceStockToDb(detail) {
    // Do nothing.
  }

  async saveToFirestore(sku, doc) {
    // Do nothing.
  }

  isIdTaiwanSuspened(sku) {
    return false;
  }

  isLargerBox(modelNumber) {
    return false;
  }

  async fetchGoatPrice(modelNumber, variantCode) {
    return null;
  }
}

test('Sku', async () => {
  const sku = await Sku.find('TEST-SKU-SIZE', new SkuDataHandlerStub());
  const crewsupply = await sku.getRawPriceStock('crewsupply');
  expect(crewsupply.price).toBe(133.7);
  expect(crewsupply.qty).toBe(7);

  const duRaw = await sku.getRawPriceStock('du');
  expect(duRaw.lowest_price).toBe(161900);

  const du = await sku.getPriceStock('du');
  expect(du.price).toBe(326);

  const preferred = await sku.getPreferredPriceStock();
  expect(preferred.price).toBe(133.7);
  expect(preferred.source).toBe('crewsupply');
});

test('Sku oversold', async () => {
  const sku = await Sku.find('TEST-SKU2-SIZE', new SkuDataHandlerStub());
  const hkmarathonRaw = await sku.getRawPriceStock('hkmarathon');
  expect(hkmarathonRaw.qty).toBe(7);
  const hkmarathon = await sku.getPriceStock('hkmarathon');
  expect(hkmarathon.qty).toBe(7);

  const preferred = await sku.getPreferredPriceStock();
  expect(preferred.source).toBe('du');

  // hkmarathon is sold out, then the next preferred source is du.
  // DU is hardcoded to have a qty of 20 in the calculation process.
  expect(preferred.qty).toBe(11);
});

test('Sku all sold out', async () => {
  const sku = await Sku.find('TEST-SKU3-SIZE', new SkuDataHandlerStub());

  const preferred = await sku.getPreferredPriceStock();
  expect(preferred.source).toBe('');

  // hkmarathon is sold out, then the next preferred source is du.
  // DU is hardcoded to have a qty of 20 in the calculation process.
  expect(preferred.qty).toBe(0);
});

test('Sku crewsupply should not be used to fill oversold', async () => {
  const sku = await Sku.find('TEST-SKU4-SIZE', new SkuDataHandlerStub());

  const preferred = await sku.getPreferredPriceStock();
  expect(preferred.source).toBe('crewsupply');

  expect(preferred.qty).toBe(3);
});

test('Sku crewsupply should not be used to fill oversold2', async () => {
  const sku = await Sku.find('TEST-SKU5-SIZE', new SkuDataHandlerStub());

  const preferred = await sku.getPreferredPriceStock();

  // Even when sku is totally oversold, crewsupply is still shown as the
  // preferred source.
  expect(preferred.source).toBe('crewsupply');
  expect(preferred.qty).toBe(3);
});

test('Sku update price if needed', async () => {
  const sku = await Sku.find('TEST-SKU-SIZE', new SkuDataHandlerStub());
  const updated = await sku.updatePriceStockIfNeeded();
  expect(Object.keys(updated).length).toBe(0);

  // This only works when the source is primarily persisted in firestore.
  sku.setCachedPriceStock('hkmarathon', { price: 800, qty: 3 });
  const newCachedKc = await sku.getCachedPriceStock('hkmarathon');
  expect(newCachedKc.price).toBe(800);
  const updated2 = await sku.updatePriceStockIfNeeded();
  expect(Object.keys(updated2).length).toBe(3);
  expect(updated2.price).toBe(132);
  expect(updated2.source).toBe('hkmarathon');
  expect(updated2.qty).toBe(3);
});

test('Sku update price if needed - needs update', async () => {
  const sku = await Sku.find('SKU-NEED-UPDATE-SIZE', new SkuDataHandlerStub());
  const updated = await sku.updatePriceStockIfNeeded();
  expect(Object.keys(updated).length).toBe(3);
  expect(updated.price).toBe(2005);
  expect(updated.qty).toBe(3);
  expect(updated.source).toBe('kc');
});

test('Sku update price if needed - needs partial update', async () => {
  const sku = await Sku.find(
    'SKU-PARTIAL-UPDATE-SIZE',
    new SkuDataHandlerStub(),
  );
  const updated = await sku.updatePriceStockIfNeeded();
  expect(Object.keys(updated).length).toBe(2);
  expect(updated.price).toBe(2005);
  expect(updated.source).toBe('kc');
});

test('Sku update price if needed - oversold', async () => {
  const sku = await Sku.find('SKU-OVERSOLD-SIZE', new SkuDataHandlerStub());

  const updated = await sku.updatePriceStockIfNeeded();
  //console.log(updated);
  expect(Object.keys(updated).length).toBe(0);

  sku.setCachedPriceStock('hkmarathon', { qty: 3 });
  const updated2 = await sku.updatePriceStockIfNeeded();
  expect(Object.keys(updated2).length).toBe(3);
  expect(updated2.price).toBe(0);
  expect(updated2.source).toBe('');
  expect(updated2.qty).toBe(0, 'Qty should be 0 because kc qty is -4.');
});

test('Increase price to match GOAT', async () => {
  const sku = await Sku.find('STABLE_MOBEL-SIZE', new SkuDataHandlerStub());
  const preferred = await sku.getPreferredPriceStock();
  expect(preferred.price).toBe(133.7);

  // In the case where GOAT price is higher
  sku.additionalInfo.goat = {
    isTopModel: true,
    lowestPriceCents: {
      amount: 100000,
    },
    updatedAt: {
      seconds: Date.now() / 1000, // In production, this should be class Timestamp
    },
  };
  const preferred2 = await sku.getPreferredPriceStock();
  expect(preferred2.price).toBe(900, 'Price is increased to 900.');

  // In the case wherer GOAT price is lower
  sku.additionalInfo.goat = {
    isTopModel: true,
    lowestPriceCents: {
      amount: 10000,
    },
    updatedAt: {
      seconds: Date.now() / 1000, // In production, this should be class Timestamp
    },
  };
  const preferred3 = await sku.getPreferredPriceStock();
  expect(preferred3.price).toBe(133.7, 'Price is not changed.');

  // In the case where GOAT price is higher but the update time is too old
  sku.additionalInfo.goat = {
    isTopModel: true,
    lowestPriceCents: {
      amount: 100000,
    },
    updatedAt: {
      seconds: Date.now() / 1000 - 100000000, // In production, this should be class Timestamp
    },
  };
  const preferred4 = await sku.getPreferredPriceStock();
  expect(preferred4.price).toBe(
    133.7,
    'Price should not increase because the GOAT price is outdated.',
  );
});

test('Sku valid source', async () => {
  expect(Sku.isValidSource('crewsupply')).toBeTruthy();
  expect(Sku.isValidSource('du')).toBeTruthy();
  expect(Sku.isValidSource('hkmarathon')).toBeTruthy();
  expect(Sku.isValidSource('kc')).toBeTruthy();
  expect(Sku.isValidSource('unknown')).toBeFalsy();
  expect(Sku.isValidSource('unknown2')).toBeFalsy();
});
