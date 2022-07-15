const db = require('./db');
const { capitalise, objAssign: assign } = require('./util');

const largerBoxModelNos = [
  'BV4580-001',
  'CV2444-101',
  'CV2444-100',
  'CV2444-001',
  'BQ5397-900',
  'CJ5000-001',
  'CJ5000-002',
  'CJ5000-090',
  'AO2582-001',
  'CJ5773-002',
  'CV2443-100',
  'BQ5397-101',
  'CV2442-100',
  'CJ5774-090',
  'CJ5774-002',
  'CJ5773-090',
  'CJ5773-001',
  'BQ5397-100',
  'BQ5397-001',
  'AO2582-900',
  'AO2582-004',
  'AO2582-002',
  'CK0893-090',
  'CV2442-001'
];

const idTaiwanSuspended = ['560846C-80W', '560846C-85W'];

const currencies = [
  'usd',
  'hkd',
  'jpy',
  'eur',
  'gbp'
];

let currencyRatesCache = null;
async function fetchCurrencyRates() {
  if (!currencyRatesCache) {
    let rates = await db.getRates();
    currencies.forEach((c) => {
      const cnyValue = rates[`${c.toUpperCase()}CNYrate`];
      const usdValue = rates[`USD${c.toUpperCase()}rate`] ?? 1;
      rates = assign(rates, {
        [`${c.toLowerCase()}Cny`]: cnyValue,
        [`cny${capitalise(c.toLowerCase())}`]: 1 / cnyValue,
        [`${c.toLowerCase()}Usd`]: 1 / usdValue,
        [`usd${capitalise(c.toLowerCase())}`]: usdValue,
      });
    });

    currencyRatesCache = assign(rates, {
      cnyCny: 1
    });
  }
  return currencyRatesCache;
}

const setupConfig = null;

module.exports = {
  categoryType: {
    FREE_SHIPPING: 20,
    PRE_ORDER: 16
  },

  async getFreeShippingMarkUpRate() {
    if (!setupConfig) {
      // Delay await to avoid multiple calls to database
      setupConfig = db.getSetup();
      setupConfig = await setupConfig;
    }
    return setupConfig['mgt_freeshipping_add'];
  },

  async getRateFromCNY(currency) {
    const currencyRates = await fetchCurrencyRates();
    const key = `cny${capitalise(currency.toLowerCase())}`;
    return currencyRates[key] ?? 1;
  },

  async getRateFromUSD(currency) {
    const currencyRates = await fetchCurrencyRates();
    const key = `usd${capitalise(currency.toLowerCase())}`;
    return currencyRates[key] ?? 1;
  },

  async getRateToUSD(currency) {
    const currencyRates = await fetchCurrencyRates();
    const key = `${currency.toLowerCase()}Usd`;
    return currencyRates[key] ?? 1;
  },

  getLargerBoxModelNos() {
    return largerBoxModelNos;
  },

  isLargerBox(modelNo) {
    return largerBoxModelNos.includes(modelNo);
  },

  isIdTaiwanSuspended(sku) {
    return idTaiwanSuspended.includes(sku);
  },
}
