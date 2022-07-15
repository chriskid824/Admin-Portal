const mysql = require('mysql');
const config = require('./config.js');

const connection = mysql.createConnection(config.db);

async function query(query, params = []) {
  return new Promise((resolve, reject) => {
    connection.query(query, params, async function(err, result) {
      if (err)
        reject(err);
      else
        resolve(result);
    });
  });
}


exports.query = query;
