import fs from 'fs';
import mysql, { RowDataPacket } from 'mysql2/promise';
import 'dotenv/config';
import { templateFromModelNumber } from '../goat';

function writeResultToFile(result: any, fileName: string) {
  // Result is a JSON object
  const json = JSON.stringify(result);
  fs.writeFileSync(fileName, json);
}

async function fetchProblematicProductsFromDatabase() {
  const dbConnection = await mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  });
  const sql = `
SELECT model_no, name, product_type
      FROM kickscrew_db2.sys_product
      WHERE name NOT REGEXP "^[0-9a-zA-Z   <>@\\\\&_%:?,#$*\\"'\`!()/+.-]*$" && deleted = 0
      LIMIT 1000;
      `;
  const [rows] = await dbConnection.execute(sql);
  dbConnection.end();
  console.log(rows);
  return rows as RowDataPacket[];
}

async function processModel(modelNumber: string) {
  const template = await templateFromModelNumber(modelNumber);
  if (template) {
    writeResultToFile(template, `./result/${modelNumber}.json`);
    console.log(`GOAT: ${modelNumber} processed`);
  } else {
    console.log(`GOAT: ${modelNumber} not found`);
  }
}


async function main() {
  const productsToFetch = await fetchProblematicProductsFromDatabase();

  for (const product of productsToFetch) {
    const modelNumber = product.model_no;
    await processModel(modelNumber);
    // Sleep for 2 seconds
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

main();
