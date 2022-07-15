import express from 'express';

import orderRouter from './order';
import versionRouter from './version';
import shopifyWebhookRouter from './shopifyWebhook';

const routerV1 = express.Router();
routerV1.use('/order', orderRouter);
routerV1.use('/version', versionRouter);
routerV1.use('/shopifyWebhook', shopifyWebhookRouter);

export default function (app) {
  app.use('/v1', routerV1);
}
