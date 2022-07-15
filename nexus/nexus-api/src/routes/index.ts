import express from 'express';

import productRouter from './product';
import versionRouter from './version';

const routerV1 = express.Router();
routerV1.use('/product', productRouter);
routerV1.use('/version', versionRouter);

export default function (app) {
  app.use('/v1', routerV1);
}
