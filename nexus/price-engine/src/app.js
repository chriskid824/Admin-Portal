const express = require('express');
const Calculator = require('./calculator');
const db = require('./db');
const publishMessage = require('./pubsub');
const Sku = require('./sku');
const fs = require('./fs');

const app = express();

async function recalculate(skuNumber, skipSync) {
  try {
    const sku = await Sku.find(skuNumber);
    const updated = await sku.forceUpdatePriceStock();
    const { price, qty, source } = updated;
    if (!skipSync) {
      if (price !== null) {
        const data = { sku: skuNumber, price, source, forced: true };
        console.log(`[${skuNumber}][${source}] price-update:`, JSON.stringify(data));
        publishMessage(data, process.env.PUBSUB_PRICE_UPDATE);
      }
      if (qty !== null) {
        const data = { sku: skuNumber, qty, forced: true };
        console.log(`[${skuNumber}][${source}] stock-update:`, JSON.stringify(data));
        publishMessage(data, process.env.PUBSUB_STOCK_UPDATE);
      }
    }
    return { sku: skuNumber, price, qty, source };
  } catch (e) {
    console.error(`[${skuNumber}][ERROR]`, e);
    return;
  }
}

function parsePayload(body) {
  if (!body) {
    throw new Error('no Pub/Sub message received');
  }
  if (!body.message) {
    throw new Error('invalid Pub/Sub message format');
  }

  const pubSubMessage = body.message;
  const data = pubSubMessage.data
    ? Buffer.from(pubSubMessage.data, 'base64').toString().trim()
    : '{}';
  let payload;
  try {
    payload = JSON.parse(data);
  } catch (e) {
    throw new Error('INVALID JSON ... skipping | ' + data);
  }

  const payloadFieldTypes = {
    sku: 'string',
    source: 'string',
    price: 'number',
    qty: 'number',
    timestamp: 'number',
  };
  
  // {
  //   "sku": "CI1166-001-115",   // Style code "CI1166-001" and size US 11.5
  //   "source": "du",
  //   "price": 120,              // from `price-source-update` topic
  //   "qty": 3,                  // from `stock-source-update` topic
  //   "timestamp": 1646028960000 // in milliseconds
  // }
  for (const k in payload) {
    if (!payloadFieldTypes.hasOwnProperty(k)) {
      continue;
    }
    const type = payloadFieldTypes[k];
    const v = payload[k];
    if (type && typeof(v) !== type) {
      throw new Error(`INVALID FIELD TYPE: *${k}* is *${typeof(v)}*, should be *${type}* ... skipping | ${data}`);
    }
    switch (type) {
      case 'number':
        if (isNaN(v)) {
          throw new Error(`INVALID FIELD VALUE: *${k}* is NaN ... skipping | ${data}`);
        }
        break;
    }
  }

  return payload;
}

app.use(express.json());

app.post('/', async (req, res) => {
  let payload;
  try {
    payload = parsePayload(req.body);
  } catch (e) {
    const msg = e.message ?? 'INVALID PAYLOAD';
    console.error(`error: ${msg}`);
    res.status(204).send(`Bad Request: ${msg}`);
    return;
  }
  const { sku, source, price, qty, timestamp } = payload;
  // eslint-disable-next-line prettier/prettier
  console.log(`[${sku}][${source}] price: ${price} ; qty: ${qty} ; timestamp: ${timestamp} ; date: ${new Date(timestamp)}`);
  if (sku && source) {
    try {
      const calculator = new Calculator(sku);
      await calculator.updateWith(payload);
    } catch (e) {
      console.error(`[${sku}][${source}][ERROR]`, e);
      return;
    }
  }

  res.status(201).send();
});

app.get('/sku/:sku', async (req, res) => {
  const sku = req.params['sku'];
  let data;
  try {
    data = await fs.getPriceStock(sku);
  } catch (e) {
    console.error(`[get sku: ${sku}] failed. | ${e}`);
    res.status(500).send({ success: false, message: e.message });
    return;
  }
  const { _calculated } = data;
  res.status(200).send({
    success: true,
    data: Object.assign({ sku }, _calculated),
  });
});

app.post('/sku/:sku', async (req, res) => {
  const sku = req.params['sku'];
  const { skipSync = false } = req.body;
  let data;
  try {
    data = await recalculate(sku, skipSync);
  } catch (e) {
    console.error(`[${sku}] | ${e}`);
    res.status(500).send({ success: false, message: e.message });
    return;
  }

  res.status(200).send({ success: true, data });
});

app.post('/sku', async (req, res) => {
  const { skus, skipSync = false } = req.body;
  let data;
  try {
    const tasks = skus.map((sku) => recalculate(sku, skipSync));
    data = await Promise.all(tasks);
  } catch (e) {
    console.error(`[batch] | ${e}`);
    res.status(500).send({ success: false, message: e.message });
    return;
  }

  res.status(200).send({ success: true, data });
});

app.get('/modelNo/:modelNo', async (req, res) => {
  const modelNo = req.params['modelNo'];
  const skus = await db.getProductSKUs(modelNo);
  let data;
  try {
    const tasks = skus.map(({ sku }) => fs.getPriceStock(sku));
    data = await Promise.all(tasks);
  } catch (e) {
    console.error(`[get modelNo: ${modelNo}] failed. | ${e}`);
    res.status(500).send({ success: false, message: e.message });
    return;
  }
  const extractedDataArr = data.map(
    ({ _calculated, sku }) => Object.assign({ sku }, _calculated)
  );
  res.status(200).send({ success: true, data: extractedDataArr });
});

app.post('/modelNo/:modelNo', async (req, res) => {
  const modelNo = req.params['modelNo'];
  const { skipSync = false } = req.body;
  const skus = await db.getProductSKUs(modelNo);
  let data;
  try {
    const tasks = skus.map(({ sku }) => recalculate(sku, skipSync));
    data = await Promise.all(tasks);
  } catch (e) {
    console.error(`[${modelNo}] | ${e}`);
    res.status(500).send({ success: false, message: e.message });
    return;
  }

  res.status(200).send({ success: true, data });
});

module.exports = app;
