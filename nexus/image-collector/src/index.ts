import { processRequest } from './main.js';
import express from 'express';

const app = express();

app.use(express.json());

app.post('/', async (req, res) => {
  if (!req.body) {
    const msg = 'no Pub/Sub message received';
    console.error(`error: ${msg}`);
    res.status(400).send(`Bad Request: ${msg}`);
    return;
  }
  if (!req.body.message) {
    const msg = 'invalid Pub/Sub message format';
    console.error(`error: ${msg}`);
    res.status(400).send(`Bad Request: ${msg}`);
    return;
  }

  const pubSubMessage = req.body.message;
  const data = pubSubMessage.data
    ? Buffer.from(pubSubMessage.data, 'base64').toString().trim()
    : '{}';

  try {
    const payload = JSON.parse(data);
    await processRequest(payload);
    res.status(204).send();
  } catch (e) {
    console.error(e);
    const msg = 'Error occurred | ' + data;
    console.error(`error: ${msg}`);
    res.status(400).send(`Bad Request: ${msg}`);
  }
});

app.listen(process.env.PORT || 8080, () => {
  console.log(`Listening on port ${process.env.PORT || 8080}`);
});
