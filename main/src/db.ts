import * as mysql from 'mysql2';

import config from './config';

export const connection = mysql.createPool({
  host: config.db.host,
  user: config.db.username,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
