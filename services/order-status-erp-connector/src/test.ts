import { syncStockTransfers } from './function';
import erp from './erp';

async function test() {
  console.log(await erp.fetchOrders(20, 1, '2022-03-30 00:00:00'));
  //syncStockTransfers();
  return;
  const result = await erp.fetchOrder('SO208181102733');
  const str = JSON.stringify(result, null, 2);
  console.log(str);
}
test();
//syncFromErp();
