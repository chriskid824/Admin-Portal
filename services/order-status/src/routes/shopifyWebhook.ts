import express from 'express';
import db from '../db';
import { createHmac } from 'crypto';

import { Order } from '../models/order';

function forbidden(res) {
  res.status(403);
  res.json({
    status: 'error',
    msg: 'Forbidden',
  });
}

const apiSecretKey = process.env.SHOPIFY_API_SECRET_KEY;
function verifyWebhook(data: Buffer, hmac: string) {
  if (!apiSecretKey) {
    throw new Error('Missing shopify API secret key');
  }
  // Calculate hmac hash of data
  const keyBuffer = Buffer.from(apiSecretKey, 'utf8');
  const hash = createHmac('sha256', keyBuffer).update(data).digest('base64');
  return hash === hmac;
}

const router = express.Router();
router.post('/', async (req, res) => {
  // Authenticate Webhook
  const hmac = req.headers['x-shopify-hmac-sha256'];
  if (!hmac) {
    return forbidden(res);
  }
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  if (!verifyWebhook(req.rawBody, hmac)) {
    return forbidden(res);
  }
  console.log('Webhook Authenticated');

  const topic = req.headers['x-shopify-topic'];
  const shopifyOrderId = req.body.id;
  const orderId = req.body.name;

  if (!topic || !shopifyOrderId || !orderId) {
    res.status(400);
    res.json({
      status: 'error',
      msg: 'Missing required fields',
    });
    return;
  }

  // Update order status
  let order = await Order.findById(orderId);
  if (!order) {
    order = new Order(orderId);
  }
  const changed = order!.processShopifyWebhook(topic as string, req.body);
  if (changed) {
    await order!.save();
  }

  // Save webhook message
  const collection = db.collection('shopifyWebhookMessages');
  await collection.add({
    topic,
    orderId,
    message: req.body,
    receivedAt: new Date(),
  });

  res.json({
    status: 'ok',
  });
});

export default router;
