import { Product } from './models/product';

async function test() {
  console.log('test');
  const product = new Product('AJ1935-002');
  const paths = await product.fetchAllSourceImagePaths();
  console.log(paths);

  await product.populateImagesFromSource('du');
  const images = product.images;
  console.log(images);
}
test();
