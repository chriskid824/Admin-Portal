import { PubSub } from '@google-cloud/pubsub';
import mysql, { RowDataPacket } from 'mysql2/promise';
import fs from 'fs';

import 'dotenv/config';

const pubsub = new PubSub();
const topicName = process.env.PUBSUB_TOPIC;

const publishMessage = async (message, topicName) => {
  if (typeof message !== 'string') {
    message = JSON.stringify(message);
  }

  const topic = pubsub.topic(topicName);
  const data = Buffer.from(message);

  const callback = (err, messageId) => {
    if (err) {
      const errMsg = `[${messageId}] unable to publish message to ${topicName}`;
      console.error(err);
      throw new Error(errMsg);
    }
  };

  topic.publishMessage({ data }, callback);
};

function extOfUrl(url: string) {
  const parts = url.split('.');
  let ext = parts[parts.length - 1];
  if (!ext) {
    throw new Error(`No extension found in ${url}`);
  }

  ext = ext.toLowerCase();
  if (ext !== 'jpg' && ext !== 'jpeg' && ext !== 'png') {
    ext = 'jpg';
    //throw new Error(`Unsupported extension ${ext}`);
  }
  return ext;
}

// XXX: This needs to add `productType`
async function createTasksForRows(
  connection: mysql.Connection,
  rows: RowDataPacket[],
) {
  console.log(`Creating tasks for ${rows.length} rows`);
  for (const row of rows as RowDataPacket[]) {
    console.log(`Creating task for ${row.title}, ${row.modelNumber}`);
    const message = {
      modelNumber: row.modelNumber,
      force: true,
      source: 'du',
      productType: 'shoe',
      images: [] as Array<any>,
    };

    // Main image
    try {
      const mainExt = extOfUrl(row.spuLogo);
      message.images.push({
        name: `main.${mainExt}`,
        url: row.spuLogo,
      });
    } catch (err) {
      console.error(err);
    }

    // Other images
    const [images] = await connection.query(
      `SELECT url, sequence, udt
        FROM spus_images
        WHERE spu_id = ?
        ORDER BY udt DESC`,
      [row.spuId],
    );
    let lastUdt: Date | null = null;
    const sequenceSet = new Set();
    for (const image of images as RowDataPacket[]) {
      // Check if we already have this sequence
      const sequence = image.sequence;
      if (sequenceSet.has(sequence)) {
        continue;
      }
      sequenceSet.add(sequence);

      // Check if the next image is fetch from another period
      // Get second difference between udt and lastUdt
      if (lastUdt === null) {
        lastUdt = image.udt;
      } else {
        const diff = lastUdt ? lastUdt.getTime() - image.udt.getTime() : 0;
        const msInDay = 1000 * 60 * 60 * 24;
        if (diff > msInDay) {
          break;
        }
        lastUdt = image.udt;
      }
      try {
        const ext = extOfUrl(image.url);
        message.images.push({
          name: `${sequence}.${ext}`,
          url: image.url,
        });
      } catch (err) {
        console.error(err);
      }
    }

    if (message.images.length > 0) {
      console.log(`Publishing task for ${row.modelNumber}`, message);
      publishMessage(message, topicName);
    }
  }
}

async function createTasks(numTasks: number, startPage = 0) {
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    database: process.env.DATABASE_NAME,
    password: process.env.DATABASE_PASSWORD,
  });

  console.log('Connected to database');

  const pageSize = 1000;
  let page = startPage;

  while (pageSize * page < numTasks) {
    const offset = page * pageSize;
    const limit = Math.min(numTasks - offset, pageSize);
    console.log(`Fetching page ${page}...`);
    const [rows] = await connection.query(
      'SELECT title, article_number as modelNumber, spu_logo as spuLogo, spu_id as spuId FROM `spus` LIMIT ? OFFSET ?',
      [limit, offset],
    );
    await createTasksForRows(connection, rows as RowDataPacket[]);
    page++;
  }
}

let connection: mysql.Connection | null = null;
async function createTaskForModelNumber(modelNumber: string) {
  if (!connection) {
    connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USER,
      database: process.env.DATABASE_NAME,
      password: process.env.DATABASE_PASSWORD,
    });
    console.log('Connected to database');
  }

  const [rows] = await connection.query(
    `SELECT
      title,
      article_number as modelNumber,
      spu_logo as spuLogo,
      spu_id as spuId
      FROM spus WHERE article_number = ?`,
    [modelNumber],
  );
  await createTasksForRows(connection, rows as RowDataPacket[]);
}

const modelNumbers = [
  'AT9194-001',
];

async function createTasksFromList(modelNumbers: string[]) {
  for (const modelNumber of modelNumbers) {
    if (modelNumber.trim().length === 0) {
      continue;
    }
    console.log(`Creating task for ${modelNumber}`);
    await createTaskForModelNumber(modelNumber);
  }
}

async function createTasksFromFile(filePath: string) {
  const modelNumbers = fs.readFileSync(filePath, 'utf8').split('\n');
  await createTasksFromList(modelNumbers);
}

createTasksFromFile('/Users/jeanno/Projects/kickscrew/admin-portal/tools/swiss/skulist.uniq');
//createTasksFromList(modelNumbers);

//createTasks(10, 0);
