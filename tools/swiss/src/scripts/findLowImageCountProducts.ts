import fs from 'fs';

function exportToCsv(products: Map<string, any>, fileName: string) {
  // id, modelNumber, title, imageCount
  const csvHeader = 'id,modelNumber,title,imageCount\n';
  fs.writeFileSync(fileName, csvHeader);
  for (const kv of products) {
    const id = kv[0];
    const product = kv[1];
    const modelNumber = product.modelNumber?.value ?? '';
    const title = product.title;
    const imageCount = product.imageCount;
    const escapedTitle = title?.replace(/"/g, '""');
    const escapedModelNumber = modelNumber?.replace(/"/g, '""');
    const csvLine = `${id},"${escapedModelNumber}","${escapedTitle}",${imageCount}\n`;
    fs.appendFileSync(fileName, csvLine);
  }
}

async function main() {
  const fileName = './bulk-1318321291459.jsonl';
  // Hashmap of id to product
  const products = new Map<string, any>();

  // Read file line by line
  const lines = fs.readFileSync(fileName, 'utf8').split('\n');
  let count = 0;
  let productCount = 0;
  for (const line of lines) {
    let json;
    try {
      json = JSON.parse(line);
    } catch (e) {
      continue;
    }
    if (!json) {
      continue;
    }
    if (json.id.includes('ProductImage')) {
      // This is an image
      const productId = json.__parentId;
      const product = products.get(productId);
      if (product) {
        product.imageCount++;
      } else {
        console.log('Product not found', productId);
      }
    } else {
      // This is a product
      json.imageCount = 0;
      products.set(json.id, json);
      productCount++;
    }
    count++;
  }
  console.log('Total processed', count);
  console.log('Total products', productCount);

  console.log('Exporting to csv');
  exportToCsv(products, './shopify-image-count.csv');
  console.log('Done');
}


main();
