import { Order, StatusType } from './order';

test('Create order and add status', () => {
  const order = new Order('testId');
  expect(order).toBeTruthy();

  order.addStatus({
    type: StatusType.SELLER_CONFIRMED,
    datetime: new Date(),
  });
  expect(order.status.length).toBe(1);

  order.addStatus({
    type: StatusType.SELLER_CONFIRMED,
    datetime: new Date('2011'),
  });
  // Duplicate status should not be added
  expect(order.status.length).toBe(1);

  order.addStatus({
    type: StatusType.SELLER_SHIPPED,
    datetime: new Date('2011'),
  });
  expect(order.status.length).toBe(2);
  expect(order.status[0].type).toBe(StatusType.SELLER_SHIPPED);
});
