import fs from 'fs';
import readline from 'readline';
import { drive_v3, google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import { Storage } from '@google-cloud/storage';

import { saveImagePaths } from '../imagePaths.js';
import { publishToSink } from '../messages.js';

const storage = new Storage();
const bucketName = process.env.BUCKET_NAME ?? '';
const bucket = storage.bucket(bucketName);

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];
const TOKEN_PATH = 'token.json';

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

// This doesn't work
async function getGoogleAuth() {
  const auth = new GoogleAuth({
    scopes: SCOPES,
  });
  return auth.getClient();
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

async function uploadImageFromDriveFile(
  imageName: string,
  fileId: string,
  drive: drive_v3.Drive,
  force = true,
): Promise<boolean> {
  if (!fileId) {
    console.log('No file id');
    return false;
  }
  const file = bucket.file(imageName);

  // Check if file exists
  if (!force && (await file.exists())[0]) {
    console.log(`File ${imageName} already exists`);
    return false;
  }

  // Download the image from Google Drive
  return new Promise((resolve, reject) => {
    const dest = file.createWriteStream();
    drive.files.get({ fileId, alt: 'media' }, {responseType: 'stream'}, (err, res) => {
      if (err) {
        console.log(`Error downloading ${imageName}`, err);
        reject(err);
      }
      // @ts-ignore Not sure why `pipe` is not recognized
      res?.data.pipe(dest)
      .on('error', function (err) {
        console.error(err);
        reject(err);
      })
      .on('finish', function () {
        console.log(`Downloaded image ${imageName} from ${fileId}`);
        resolve(true);
      });
    });
  });
}

async function processFilesForModelNumber(modelNumber: string, files, drive) {
  // TODO: Skip folders if there's any
  console.log(`Found ${files.length} files in ${modelNumber}`);
  const imagePaths: string[] = [];
  let mainPath: string | null = null;
  const promises: Promise<boolean>[] = [];
  for (const file of files) {
    // Put in the kickscrew folder
    const path = `${modelNumber}/kickscrew/${file.name}`;
    promises.push(uploadImageFromDriveFile(
      path,
      file.id ?? '',
      drive,
    ));
    if (file?.name?.startsWith('main')) {
      mainPath = path;
    } else {
      imagePaths.push(path);
    }
  }
  await Promise.all(promises);

  // Sort imagePaths
  imagePaths.sort((a, b) => {
    return a > b ? 1 : -1;
  });

  // Insert main image in front
  if (mainPath) {
    imagePaths.unshift(mainPath);
  } else {
    throw new Error(`No main image found for ${modelNumber}`);
  }
  // Save source paths
  await saveImagePaths(modelNumber, imagePaths);
  console.log(`Saved ${imagePaths.length} images for ${modelNumber}`);

  // Publish to sink pubsub topic
  const imageUrls = imagePaths.map((path) => {
    const file = bucket.file(path);
    return file.publicUrl();
  });
  console.log(`Publishing ${imageUrls} for ${modelNumber}`);

  await publishToSink(modelNumber, imageUrls);
}

async function processProductFolder(modelNumber: string, folderId: string, drive: drive_v3.Drive) {
  if (!modelNumber || !folderId) {
    console.log('No model number or folder id');
    return;
  }
  console.log('Handling product folder', modelNumber, folderId);
  return new Promise((resolve, reject) => {
    drive.files.list({
      q: `"${folderId}" in parents and trashed = false`,
      pageSize: 10,
      fields: 'nextPageToken, files(id, name)',
    }, async (err, res) => {
      if (err) {
        console.error(`Error getting files for ${modelNumber}`, err);
        reject(err);
      }
      const files = res?.data.files;
      if (files) {
        await processFilesForModelNumber(modelNumber, files, drive);
      }
      resolve(null);
    });
  });
}

export async function syncAll() {
  console.log('Syncing all');
  // TODO: Switch to use service account
  const auth = await getAuth();
  if (auth) {
    const authClient = auth as any;
    const drive = google.drive({version: 'v3', auth: authClient });
    const folderId = '12WhQ8EW8DrrDx3Wlbj0G6JOaDPcfl2G1';
    // TODO: Handle multiple pages
    drive.files.list({
      q: `"${folderId}" in parents and trashed = false and modifiedTime > '2022-04-21T12:00:00'`,
      pageSize: 1000,
      fields: 'nextPageToken, files(id, name)',
    }, async (err, res) => {
      if (err) {
        return console.log('The API returned an error: ' + err);
      }
      const files = res?.data.files;
      if (files?.length) {
        for (const file of files) {
          try {
            await processProductFolder(file.name ?? '', file.id ?? '', drive);
          } catch (e) {
            console.log(e);
          }
        };
      } else {
        console.log('No files found.');
      }
    });
  }
}
