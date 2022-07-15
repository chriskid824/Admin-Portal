import fs from 'fs';
import readline from 'readline';
import { PubSub } from '@google-cloud/pubsub';
import { google, sheets_v4 } from 'googleapis';
import mysql, { RowDataPacket } from 'mysql2/promise';
import { URL } from 'node:url';

import 'dotenv/config';

const pubsub = new PubSub();
const topicName = process.env.PUBSUB_TOPIC;

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const TOKEN_PATH = 'token.json';

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
    throw new Error(`Unsupported extension ${ext}`);
  }
  return ext;
}

function toUrl(url: string) {
  let urlObj: URL;
  try {
    urlObj = new URL(url);
  } catch (error) {
    if (error instanceof TypeError && error['code'] === 'ERR_INVALID_URL') {
      console.log(error.message, '|', error['input']);
    }
    return null;
  }
  return urlObj;
}

// XXX: This needs to add `productType`
async function createTasksForRows(rows: RowDataPacket[]) {
  console.log(`Creating tasks for ${rows.length} rows`);
  for (const row of rows as RowDataPacket[]) {
    console.log(`Creating task for ${row.name}, ${row.modelNumber}`);
    const message = {
      modelNumber: row.modelNumber,
      source: 'snkrdunk',
      productType: 'shoe',
      images: [] as Array<any>,
    };

    try {
      const mainExt = extOfUrl(row.spuLogo);
      message.images.push({
        name: `main.${mainExt}`,
        url: row.spuLogo,
      });
    } catch (err) {
      console.error(err);
    }

    console.log(`Publishing task for ${row.modelNumber}`, message);
    publishMessage(message, topicName);
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
      `SELECT name, sku as modelNumber, image as spuLogo
        FROM snkrdunk.info ORDER BY RAND() LIMIT ? OFFSET ?`,
      [limit, offset],
    );
    await createTasksForRows(rows as RowDataPacket[]);
    page++;
  }
}

// createTasks(10000);

// OAuth2 functions to access Google Sheets
// copied from `syncFromGoogleDrive.ts`

let auth = null;
async function getAuth() {
  if (auth) {
    return auth;
  }
  return new Promise((resolve, reject) => {
    fs.readFile('credentials.json', (err, content) => {
      if (err) return console.log('Error loading client secret file:', err);
      // Authorize a client with credentials, then call the Google Drive API.
      const contentStr = content.toString();
      authorize(JSON.parse(contentStr), (auth) => {
        resolve(auth);
      });
    });
  });
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
 function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token.toString()));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

async function readSheets(sheets: sheets_v4.Sheets, spreadsheetId: string, range: string): Promise<any[][]> {
  return new Promise((resolve, reject) => {
    sheets.spreadsheets.values.get(
      { spreadsheetId, range },
      (err, res) => {
        if (err) {
          console.log('The API returned an error: ' + err);
          reject(err);
        }
        const rows = res?.data.values;
        if (rows?.length) {
          resolve(rows);
        } else {
          console.log('No data found.');
          resolve([]);
        }
      }
    );
  });
}

async function createTasksFromSheets(offset = 0) {
  // TODO: Switch to use service account
  const auth = await getAuth();
  if (auth) {
    const authClient = auth as any;
    const sheets = google.sheets({version: 'v4', auth: authClient});
    const spreadsheetId = '1Cjea9JR8HbG-qj3CL9B3o_wpu4DmASgx6gQdqLeQa2s';
    
    const firstRow = 2;
    const startRow = firstRow + offset;
    const range = `Sheet1!B${startRow}:E`;
    
    const sheetRows = await readSheets(sheets, spreadsheetId, range);
    
    const rows: RowDataPacket[] = [];
    // columns B (product url), D (product name) and E (image url), correspond to indices 0, 2 and 3.
    for (const row of sheetRows) {
      const productUrl = row[0];
      if (!productUrl) {
        continue;
      }

      const productIdEncoded = productUrl.split('/').pop();
      const productId = decodeURIComponent(productIdEncoded).trim();
      const productName = row[2];
      const imageUrl = toUrl(row[3]);
      if (imageUrl === null) {
        console.log(`Invalid image URL for ${productUrl}: ${imageUrl}`);
      } else {
        const rdp = {
          modelNumber: productId,
          name: productName,
          spuLogo: `${imageUrl.origin}${imageUrl.pathname}`,
        };
        rows.push(rdp as RowDataPacket);
      }
    }
    
    if (rows.length > 0) {
      await createTasksForRows(rows as RowDataPacket[]);
    } else {
      console.log(`No valid data found with offset ${offset}`);
    }
  }
}

createTasksFromSheets();
