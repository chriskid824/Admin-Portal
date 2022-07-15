const mysql = require('mysql2');
// dotenv
require('dotenv').config();

const sourceColumns = [
  'ff',
  'kc',
  'dk',
  'con',
  'du',
  'heiya',
  'gx',
  'mu'
];

const kcdb = process.env.DB_DATABASE ?? 'test';
const dudb = process.env.DU_DATABASE ?? 'test';
const connectionLimit = process.env.DB_CONNECTION_LIMIT ?? 5;

const connection = mysql.createPool({
  host: process.env.DB_HOST ?? 'localhost',
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: kcdb,
  waitForConnections: true,
  connectionLimit,
  queueLimit: 0,
});

async function query(sql, values) {
  return new Promise((resolve, reject) => {
    connection.query(sql, values,
      (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      }
    );
  });
}

async function queryExists(sql, values) {
  const result = await query(sql, values);
  return result.length > 0;
}

async function queryOne(sql, values) {
  const result = await query(sql, values);
  return result.length ? result[0] : null;
}

async function queryValue(sql, values) {
  const result = await queryOne(sql, values);
  return result ? result[Object.keys(result)[0]] : null;
}

async function getRates() {
  return queryOne(
    'SELECT * FROM sys_rate ORDER BY `id` DESC LIMIT 1'
  );
}

async function getSetup() {
  return queryOne('SELECT * FROM `sys_setup` LIMIT 1');
}

async function getCategoryByProduct(productId, type) {
  return query(
    `SELECT DISTINCT category_id
    FROM sys_r_category_product
    WHERE category_id = ? AND product_id = ?`,
    [type, productId]
  );
}

async function getCurrentStockDetail(sku) {
  return queryOne(
    `SELECT p.id pid, s.kc_sku sku, s.model_no,
      s.price, s.cost_price, s.source, s.qty
    FROM mgt_price_stock s, sys_product p
    WHERE s.kc_sku = ? and s.model_no = p.model_no and p.deleted = 0
    LIMIT 1`,
    [sku]
  );
}

async function getProductDetail(sku) {
  return queryOne(
    `SELECT p.id pid, s.sku, p.model_no
    FROM sys_stock s, sys_product p
    WHERE s.sku = ? and s.product_id = p.id and p.deleted = 0
    LIMIT 1`,
    [sku]
  );
}

async function getProductSKUs(modelNo) {
  return query(
    `SELECT s.sku
    FROM sys_stock s, sys_product p
    WHERE s.product_id = p.id and p.deleted = 0 and p.model_no = ?`,
    [modelNo]
  );
}

async function getIsProductSuspendedBySource(modelNo, source) {
  if (!sourceColumns.includes(source)) return true;
  return queryExists(
    `SELECT id
    FROM upload_suspend_new
    WHERE model_no = ? AND ${source} <> "Y" AND platform in ("KC_WEB", "ALL")`,
    [modelNo]
  )
}

// for KC
async function getQtyByWarehouse(sku, warehouseCode) {
  return queryValue(
    `SELECT SUM(salable_qty) qty
    FROM erp_stock0
    WHERE del = 0 and sku_code = ? and warehouse_code = ?`,
    [sku, warehouseCode]
  );
}

async function getStockDetailBySource(sku, source) {
  switch(source) {
    case 'kc':
      return getStockDetailKC(sku);
    case 'con':
      return getStockDetailConsign(sku);
    case 'du':
      return getStockDetailDU(sku);
    case 'heiya':
      return getStockDetailHeiya(sku);
    case 'id':
      return getStockDetailIdTaiwan(sku);
    case 'af':
      return getStockDetailAfTaiwan(sku);
    case 'snkrdunk':
      return getStockDetailSnkrdunk(sku);
  }
  return null;
}

async function getStockDetailKC(sku) {
  return queryOne(
    `SELECT DISTINCT t.sku, t.erpsku, t.qty, t.price, p.model_no, p.id pid
    FROM sys_stock t
    LEFT JOIN sys_product p ON p.id = t.product_id AND p.deleted = 0
    WHERE t.deleted = 0 AND t.sku = ?
    LIMIT 1`,
    [sku]
  );
}

// // Dunk included under Heiya
// async function getStockDetailDunk(sku) {
//   return queryOne(
//     `SELECT id, stock, kc_sku, price, price_goat, manual_price
//     FROM dk_stock
//     WHERE kc_sku = ? AND stock > 0 AND (price > 100 OR manual_price > 100)
//     ORDER BY price ASC LIMIT 1`,
//     [sku]
//   );
// }

async function getStockDetailConsign(sku) {
  return queryOne(
    `SELECT id, kc_sku, price_USD, goat_price_USD, qty
    FROM con_stock
    WHERE kc_sku = ? AND qty > 0 AND price_USD > 10
    ORDER BY price_USD ASC, qty DESC, supplier_code DESC
    LIMIT 1`,
    [sku]
  );
}

async function getStockDetailDU(sku) {
  return queryOne(
    `SELECT id, lowest_price, qty, kc_sku, lowest_price_express, qty_express
    FROM ${dudb}.skus
    WHERE kc_sku = ?
    AND (qty > 0 AND lowest_price > 10000 OR qty_express > 0 AND lowest_price_express > 10000)
    AND sku_status = 1
    ORDER BY lowest_price ASC
    LIMIT 1`,
    [sku]
  );
}

async function getStockDetailHeiya(sku) {
  // supplier_id=24 is Wankee stock (consign)
  return queryOne(
    `SELECT h.*
    FROM heiya_stock h
    WHERE h.kc_sku = ? AND h.quantity > 0 AND price_ori > 100
    AND supplier_id <> 24
    ORDER BY h.price_ori ASC
    LIMIT 1`,
    [sku]
  );
}

async function getStockDetailIdTaiwan(sku) {
  return queryOne(
    `SELECT *
    FROM id_stock
    WHERE kc_sku = ? AND qty > 0 AND price > 10
    ORDER BY price ASC
    LIMIT 1`,
    [sku]
  );
}

async function getStockDetailAfTaiwan(sku) {
  return queryOne(
    `SELECT *
    FROM af_stock
    WHERE kc_sku = ? AND qty > 0 AND price > 10
    ORDER BY price ASC
    LIMIT 1`,
    [sku]
  );
}

async function getStockDetailSnkrdunk(sku) {
  // exclude extreme cases where price >= 9999999
  return queryOne(
    `SELECT price
    FROM snkrdunk.min_price
    WHERE kc_sku = ? AND price > 1000 AND price < 9999999`,
    [sku]
  );
}

async function updateStockDetail(product) {
  const {
    model_no: modelNo, price, costPrice, qty, source, sku
  } = product;
  const values = [modelNo, price, costPrice ?? 0, qty, source];
  const insertValues = [sku].concat(values);
  const updateValues = values.concat([sku]);
  const existing = await getCurrentStockDetail(sku);
  if (existing) return doUpdateStockDetail(updateValues);
  let result;
  try {
    result = await doInsertStockDetail(insertValues);
  } catch (e) {
    if (e.code !== 'ER_DUP_ENTRY') throw new Error(e);
    result = await doUpdateStockDetail(updateValues);
  }
  return result;
}

async function doInsertStockDetail(values) {
  return query(
    `INSERT INTO mgt_price_stock
    (kc_sku, model_no, price, cost_price, qty, source)
    VALUES
    (?, ?, ?, ?, ?, ?)`,
    values
  );
}

async function doUpdateStockDetail(values) {
  return query(
    `UPDATE mgt_price_stock SET
      model_no = ?,
      price = ?,
      cost_price = ?,
      qty = ?,
      source = ?,
      udt = now()
    WHERE kc_sku = ?`,
    values
  );
}

module.exports = {
  getCategoryByProduct,
  getCurrentStockDetail,
  getIsProductSuspendedBySource,
  getProductDetail,
  getProductSKUs,
  getQtyByWarehouse,
  getRates,
  getSetup,
  getStockDetailBySource,
  updateStockDetail,
  query
};
