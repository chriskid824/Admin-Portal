const express = require('express');

const { priceFix } = require('./priceFix');

const app = express();
app.use(express.json());

app.post('/', async (req, res) => {
  if (!req.body) {
    const msg = 'no Pub/Sub message received';
    console.error(`error: ${msg}`);
    res.status(204).send(`Bad Request: ${msg}`);
    return;
  }
  if (!req.body.message) {
    const msg = 'invalid Pub/Sub message format';
    console.error(`error: ${msg}`);
    res.status(204).send(`Bad Request: ${msg}`);
    return;
  }

  const pubSubMessage = req.body.message;
  const data = pubSubMessage.data
    ? Buffer.from(pubSubMessage.data, 'base64').toString().trim()
    : '{}';

  const payload = JSON.parse(data);
  await priceFix(payload);

  res.status(201).send();
});


module.exports = app;
