import express from 'express';
import { Order, StatusType } from '../models/order';

function forbidden(res) {
  res.status(403);
  res.json({
    status: 'error',
    msg: 'Forbidden',
  });
}

function notFound(res) {
  res.status(404);
  res.json({
    status: 'error',
    msg: 'Not found',
  });
}

function authWriter(req): boolean {
  if (!req.user) {
    console.error('Auth failed: No user');
    return false;
  }
  return req.user?.role === 'writer';
}

const router = express.Router();

router.get('/:orderId', async (req, res) => {
  const orderId = req.params['orderId'];
  const order = await Order.findById(orderId);
  if (!order) {
    return notFound(res);
  }
  await order.updateOrderPickedUpAndDelivered();
  await order.updateOrderCompleted();
  await order.refreshStatusIfNeeded();
  res.json({
    status: 'ok',
    data: order,
  });
});

router.post('/:orderId/status', async (req, res) => {
  // Auth
  if (!authWriter(req)) {
    return forbidden(res);
  }
  const orderId = req.params['orderId'];
  let order = await Order.findById(orderId);
  if (!order) {
    order = new Order(orderId);
  }
  try {
    order.addStatusSafe(req.body);
  } catch (e) {
    console.error(e);
    return res.status(400).json({
      status: 'error',
      msg: 'Bad request',
    });
  }
  await order.save();
  res.json({
    status: 'ok',
  });
});

export default router;
