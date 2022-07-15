import { Storage } from '@google-cloud/storage';
import { PubSub } from '@google-cloud/pubsub';

import db from '../db';
import config from '../config';
import path from 'path';
import sharp from 'sharp';

const storage = new Storage();
const bucket = storage.bucket(config.imageBucket);
function escapedModelNumber(modelNumber: string) {
  return modelNumber.replace(/\//g, '_FS_SLASH_');
}

export class Product {
  private sourceImagePaths: string[] | null = null;
  private pubsub = new PubSub();

  constructor(private modelNumber: string, public images: string[] = []) {}

  get imageUrls(): string[] {
    return this.images.map((imagePath) => {
      return `https://storage.googleapis.com/${config.imageBucket}/${imagePath}`;
    });
  }

  async save(modelNumber: string) {
    const collection = db.collection('images');
    const escaped = escapedModelNumber(modelNumber);
    const productDoc = await collection.doc(escaped);

    await productDoc.set(
      {
        imagePaths: this.images,
        modelNumber,
        updatedAt: new Date(),
      },
      { merge: true },
    );

    return this;
  }

  static createWithImageUrls(modelNumber: string, imageUrls: string[]) {
    const imagePrefix = `https://storage.googleapis.com/${config.imageBucket}/`;
    const _imageUrls = [] as string[];
    for (const imageUrl of imageUrls) {
      if (imageUrl.startsWith(imagePrefix))
        _imageUrls.push(imageUrl.slice(imagePrefix.length));
    }
    return new Product(modelNumber, _imageUrls);
  }

  static async findByModelNumber(modelNumber: string): Promise<Product> {
    // Seems weird to have one Product splited into multiple firestore
    // collections, but that will do it for now.
    const collection = db.collection('images');

    const escaped = escapedModelNumber(modelNumber);
    const productDoc = await collection.doc(escaped).get();
    const product = new Product(modelNumber);
    if (productDoc.exists) {
      const data = productDoc.data();
      if (data) {
        product.images = data.imagePaths ?? [];
      }
      return product;
    } else {
      await product.populateImagesFromSource('du');
      if (product.images.length === 0) {
        await product.populateImagesFromSource('snkrdunk');
      }
      return product;
    }
  }

  async populateImagesFromSource(source: string) {
    if (this.images.length > 0) {
      return;
    }
    const filePaths = await this.fetchAllSourceImagePaths();

    // Find all images from du
    const sourceImages: string[] = [];

    for (const filePath of filePaths) {
      if (filePath.startsWith(`${this.modelNumber}/${source}/`)) {
        const filename = filePath.split('/').pop();
        if (!filename) {
          throw new Error(`Invalid filename: ${filename}, ${filePath}`);
        }
        if (filename.includes('main-square')) {
          sourceImages.splice(0, 0, filePath);
        } else if (!filename.includes('main')) {
          sourceImages.push(filePath);
        }
      }
    }

    this.images = sourceImages;
  }

  async fetchAllSourceImagePaths(): Promise<string[]> {
    if (this.sourceImagePaths) {
      return this.sourceImagePaths;
    }
    const options = {
      prefix: `${this.modelNumber}/`,
    };
    // Lists files in the bucket, filtered by a prefix
    const [files] = await bucket.getFiles(options);

    const filePaths = files.map((file) => file.name);
    this.sourceImagePaths = filePaths;
    return filePaths;
  }

  async fetchAllSourceImageUrls(): Promise<string[]> {
    const paths = await this.fetchAllSourceImagePaths();
    return paths.map((imagePath) => {
      return `https://storage.googleapis.com/${config.imageBucket}/${imagePath}`;
    });
  }

  private async publishMessage(message, topicName) {
    if (typeof message !== 'string') {
      message = JSON.stringify(message);
    }

    const topic = this.pubsub.topic(topicName);
    const data = Buffer.from(message);

    return await topic.publishMessage({ data });
  }

  public async republishImagesToSink() {
    const imageUrls = this.imageUrls;
    const modelNumber = this.modelNumber;
    if (imageUrls) {
      const data = {
        modelNumber,
        imageUrls,
      };
      const topic = config.imageSinkUpdateTopic;
      return await this.publishMessage(data, topic);
    }
    return;
  }

  public async uploadImage(
    fileName: string,
    fileBuffer: Buffer,
    product: JSON,
  ): Promise<any> {
    const imagePath = `${this.modelNumber}/kickscrew/${fileName}`;
    const gcsfile = bucket.file(imagePath);
    let result = {};
    await gcsfile.save(fileBuffer, async (err) => {
      if (err) {
        result = {
          status: 'error',
          msg: err,
        };
      } else {
        if (product['isSquare'] == true) {
          let squareImageName;
          if (product['product_type'] === 'Shoes') {
            squareImageName = await this.createSquareImageForShoes(
              gcsfile.name,
            );
          } else {
            squareImageName = await this.createSquareImage(gcsfile.name);
          }
          if (this.images.includes(squareImageName)) {
            this.images.splice(this.images.indexOf(squareImageName), 1);
          }
          this.images.unshift(squareImageName);
          await this.save(this.modelNumber);
          await this.republishImagesToSink();
        }
        result = {
          status: 'ok',
        };
      }
    });
    return result;
  }

  public checkMainImage(imagePath: string) {
    return (
      path.parse(imagePath).name.toLowerCase() == 'main' &&
      !this.images.includes(imagePath)
    );
  }
  // Create a square image from the original image
  public async createSquareImage(imageName: string) {
    // Fetch the image from the bucket
    const file = bucket.file(imageName);
    const [exists] = await file.exists();
    if (!exists) {
      throw new Error(`File ${imageName} does not exist`);
    }

    const readStream = file.createReadStream();
    const buffer = await this.bufferFromReadStream(readStream);

    // Create the square image
    const sharpImageStep1 = sharp(buffer);

    // Use sharp to create a square image by centering the image
    const trimmedImageBuffer: Buffer = await sharpImageStep1.trim().toBuffer();

    const sharpImage = sharp(trimmedImageBuffer);
    const metadata = await sharpImage.metadata();
    const newWidth = Math.round(
      Math.max(metadata.width, metadata.height) * 1.1,
    );

    const squareImageBuffer = await sharpImage
      .resize({
        width: newWidth,
        height: newWidth,
        fit: 'contain',
        withoutEnlargement: true,
        background: { r: 255, g: 255, b: 255, alpha: 1.0 },
      })
      .toBuffer();

    const resizeSquareImageBuffer = await this.resizeWithPixelLimit(
      squareImageBuffer,
      4472,
    );

    // Upload the square image to the bucket
    const squareImageName = this.squareImageFileName(imageName);
    const outputFile = bucket.file(squareImageName);
    await outputFile.save(resizeSquareImageBuffer);
    return squareImageName;
  }

  // Create a square image for shoes from the original image
  public async createSquareImageForShoes(imageName: string) {
    // Fetch the image from the bucket
    const file = bucket.file(imageName);
    const [exists] = await file.exists();
    if (!exists) {
      throw new Error(`File ${imageName} does not exist`);
    }

    const readStream = file.createReadStream();
    const buffer = await this.bufferFromReadStream(readStream);

    // Create the square image
    let sharpImage = sharp(buffer);

    // Use sharp to create a square image by centering the image
    const trimmedImageBuffer: Buffer = await sharpImage.trim().toBuffer();

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

    const resizeSquareImageBuffer = await this.resizeWithPixelLimit(
      squareImageBuffer,
      4472,
    );

    // Upload the square image to the bucket
    const squareImageName = this.squareImageFileName(imageName);
    const outputFile = bucket.file(squareImageName);
    await outputFile.save(resizeSquareImageBuffer);
    return squareImageName;
  }
  public async bufferFromReadStream(
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
  public async resizeWithPixelLimit(image, pixelLimit) {
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
      const short = Math.round((pixelLimit * min) / max);
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
  public squareImageFileName(imageName: string): string {
    const splited = imageName.split('.');
    if (splited.length < 2) {
      throw new Error(`File ${imageName} does not have an extension`);
    }
    const ext = splited.pop() as string;
    splited[splited.length - 1] = splited[splited.length - 1] + '-square';
    splited.push(ext);
    return splited.join('.');
  }
}
