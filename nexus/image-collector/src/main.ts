import { Storage } from '@google-cloud/storage';
import fetch from 'node-fetch';
import sharp from 'sharp';
import 'dotenv/config';

import { publishToSink } from './messages.js';
import { getImagePaths } from './imagePaths.js';

const storage = new Storage();
const bucketName = process.env.BUCKET_NAME ?? '';
const bucket = storage.bucket(bucketName);

// Download the image from the url and upload it to the bucket
export async function uploadImageFromUrl(
  imageName: string,
  imageUrl: string,
  force = false,
): Promise<boolean> {
  const file = bucket.file(imageName);
  // Check if file exists
  if (!force && (await file.exists())[0]) {
    console.log(`File ${imageName} already exists`);
    return false;
  }

  // Download the image from the URL
  const res = await fetch(imageUrl);
  if (!res.ok) {
    throw new Error(
      `Unexpected response ${res.statusText} when downloading image.`,
    );
  }
  if (!res.body) {
    throw new Error('No body in response when downloading image.');
  }

  console.log(`Downloaded image ${imageName} from ${imageUrl}`);
  const ab = await res.arrayBuffer();
  const buf = Buffer.alloc(ab.byteLength);
  const view = new Uint8Array(ab);
  for (let i = 0; i < buf.length; ++i) {
    buf[i] = view[i];
  }
  const buffer = await resizeWithPixelLimit(buf, 4472);
  await file.save(buffer);
  return true;
}

async function bufferFromReadStream(
  readStream: NodeJS.ReadableStream,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    readStream.on('data', (chunk) => {
      chunks.push(chunk);
    });
    readStream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    readStream.on('error', (err) => {
      reject(err);
    });
  });
}

async function resizeWithPixelLimit(image, pixelLimit) {
  const sharpImage = sharp(image);
  const metadata = await sharpImage.metadata();
  const { width, height } = metadata;
  if (width <= pixelLimit && height <= pixelLimit) {
    return image;
  }
  let newWidth = pixelLimit;
  let newHeight = pixelLimit;

  const max = Math.max(width, height);
  const min = Math.min(width, height);
  if (max > pixelLimit) {
    const short = Math.round(pixelLimit * min / max);
    if (width > height) {
      newWidth = pixelLimit;
      newHeight = short;
    } else {
      newWidth = short;
      newHeight = pixelLimit;
    }
  }

  return await sharpImage
    .resize({
      width: newWidth,
      height: newHeight,
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1.0 },
    })
    .toBuffer();
}

function squareImageFileName(imageName: string): string {
  const splited = imageName.split('.');
  if (splited.length < 2) {
    throw new Error(`File ${imageName} does not have an extension`);
  }
  const ext = splited.pop() as string;
  splited[splited.length - 1] = splited[splited.length - 1] + '-square';
  splited.push(ext);
  return splited.join('.');
}

// Create a square image from the original image
export async function createSquareImage(imageName: string) {
  // Fetch the image from the bucket
  const file = bucket.file(imageName);
  const [exists] = await file.exists();
  if (!exists) {
    throw new Error(`File ${imageName} does not exist`);
  }

  const readStream = file.createReadStream();
  const buffer = await bufferFromReadStream(readStream);

  // Create the square image
  const sharpImageStep1 = sharp(buffer);

  // Use sharp to create a square image by centering the image
  const trimmedImageBuffer: Buffer = await sharpImageStep1
    .trim()
    .toBuffer();

  const sharpImage = sharp(trimmedImageBuffer);
  const metadata = await sharpImage.metadata();
  const newWidth = Math.round(Math.max(metadata.width, metadata.height) * 1.1);

  const squareImageBuffer = await sharpImage
    .resize({
      width: newWidth,
      height: newWidth,
      fit: 'contain',
      withoutEnlargement: true,
      background: { r: 255, g: 255, b: 255, alpha: 1.0 },
    })
    .toBuffer();

  const resizeSquareImageBuffer = await resizeWithPixelLimit(squareImageBuffer, 4472);

  // Upload the square image to the bucket
  const squareImageName = squareImageFileName(imageName);
  const outputFile = bucket.file(squareImageName);
  await outputFile.save(resizeSquareImageBuffer);
}

// Create a square image for shoes from the original image
export async function createSquareImageForShoes(imageName: string) {
  // Fetch the image from the bucket
  const file = bucket.file(imageName);
  const [exists] = await file.exists();
  if (!exists) {
    throw new Error(`File ${imageName} does not exist`);
  }

  const readStream = file.createReadStream();
  const buffer = await bufferFromReadStream(readStream);

  // Create the square image
  let sharpImage = sharp(buffer);

  // Use sharp to create a square image by centering the image
  const trimmedImageBuffer: Buffer = await sharpImage
    .trim()
    .toBuffer();

  sharpImage = sharp(trimmedImageBuffer);
  const metadata = await sharpImage.metadata();
  const sideExtend = Math.round(metadata.width * 0.02);
  const longSide = Math.max(metadata.width + sideExtend * 2, metadata.height);
  const bottomExtend = Math.round(longSide * 0.1375);
  const topExtend = longSide - bottomExtend - metadata.height;

  console.log({
    sideExtend,
    longSide,
    bottomExtend,
    topExtend,
  });
  const squareImageBuffer = await sharpImage
    .extend({
      top: Math.max(topExtend, 0),
      bottom: bottomExtend,
      left: sideExtend,
      right: sideExtend,
      background: { r: 255, g: 255, b: 255, alpha: 1.0 },
    })
    .toBuffer();

  const resizeSquareImageBuffer = await resizeWithPixelLimit(squareImageBuffer, 4472);

  // Upload the square image to the bucket
  const squareImageName = squareImageFileName(imageName);
  const outputFile = bucket.file(squareImageName);
  await outputFile.save(resizeSquareImageBuffer);
}

// Define Image type
interface Image {
  name: string;
  url: string;
}

// Currently assume we only need to handle images from DU
function getImageUrlsInSequence(modelNumber: string, source: string, images: Image[]): string[] {
  // Sort the images by name, with the first image being the main image
  let imagesSorted = [...images].sort((a, b) => {
    if (a.name.startsWith('main')) {
      return -1;
    }
    if (b.name.startsWith('main')) {
      return 1;
    }
    return a.name > b.name ? 1 : -1;
  });

  const urls = imagesSorted.map((image) => {
    // Replace the main image with the square version
    const x = image.name.startsWith('main') ? squareImageFileName(image.name) : image.name;
    const imageNameInBucket = `${modelNumber}/${source}/${x}`;
    const file = bucket.file(imageNameInBucket);
    return file.publicUrl();
  });

  return urls;
}

export async function processRequest(data: any) {
  let { modelNumber, source, images, productType, force = false } = data;
  modelNumber = modelNumber?.trim()?.toUpperCase();
  if (!modelNumber) {
    console.error('No model number provided');
    return; // Drop silently
  }
  if (!source) {
    throw new Error('No source provided');
  }
  if (!images) {
    throw new Error('No images provided');
  }
  source = source.toLowerCase();

  const promises = [] as Promise<boolean>[];
  let mainImageName: string | null = null;
  for (let image of images) {
    // Support image objects (To suppport names different than the url)
    // TODO: Escape `/` in modelNumber and image name
    if (typeof image === 'string') {
      const url: string = image;
      const name = url.split('/').pop();
      image = { name, url };
    }
    if (typeof image === 'object') {
      const { name, url } = image;
      const imageName = `${modelNumber}/${source}/${name}`;
      promises.push(uploadImageFromUrl(imageName, url, force));

      if (name.split('.')[0] === 'main') {
        mainImageName = imageName;
      }
    } else {
      throw new Error('Invalid image');
    }
  }
  await Promise.all(promises);
  if (mainImageName) {
    if (productType === 'shoe') {
      await createSquareImageForShoes(mainImageName);
    } else {
      await createSquareImage(mainImageName);
    }
  }
  const urlsInSequence = getImageUrlsInSequence(modelNumber, source, images);
  console.log(`Url in sequence: ${urlsInSequence}`);

  // If we have not manually set the image paths, then we can notify downstream
  // of the new image urls
  if (source === 'du') {
    const currentImagePaths = await getImagePaths(modelNumber);
    if (!currentImagePaths?.length) {
      await publishToSink(modelNumber, urlsInSequence);
    }
  }
  return;
}
