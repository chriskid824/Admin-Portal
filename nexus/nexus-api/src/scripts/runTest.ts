import { Product } from '../models/product';

const cl = console.log;

async function test() {
  cl('test');
  const modelNumber = 'CT8529-141';
  const product = await Product.findByModelNumber(modelNumber);
  const images = product.imageUrls;
  //const images = await product.fetchAllSourceImagePaths();
  cl(images);
}

test();
