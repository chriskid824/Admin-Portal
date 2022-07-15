import { processRequest, createSquareImage } from './main.js';
import { syncAll } from './scripts/syncFromGoogleDrive.js';
//uploadImageFromUrl(
//  'kscw-product-image-a7tp',
//  'test/my-image.jpg',
//  'https://www.google.com/images/branding/googlelogo/2x/googlelogo_light_color_272x92dp.png',
//);

async function test() {
  const data = {
    modelNumber: 'test',
    source: 'test',
    images: [
      'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png',
      'https://cdn.poizon.com/pro-img/origin-img/20220212/82b8c917529d4e2981cd50e28a827130.jpg',
    ],
  };
  await processRequest(data);
}

async function test2() {
  createSquareImage('test/main2.webp');
}

async function test3() {
  console.log('Hello, hello, hello');
  await syncAll();
}
test3();
