import * as gql from 'gql-query-builder';
import { Shopify } from '@shopify/shopify-api';
import 'dotenv/config';
import fs from 'fs';

const shopifyClient = new Shopify.Clients.Graphql(
  process.env.API_SUBDOMAIN ?? '',
  process.env.API_PASSWORD,
);

async function getShopifyProducts(cursor = '') {
  let cursorQuery = '';
  if (cursor) {
    cursorQuery = `, after: "${cursor}"`;
  }
  const res = await shopifyClient.query({
    data: `{
      products(first: 50${cursorQuery}) {
        edges {
          node {
            title
            modelNumber: metafield(namespace: "product", key: "model_no") {
              value
            }
            images(first: 5) {
              edges {
                node {
                  id
                  url
                }
              }
            }
          }
          cursor
        }
      }
    }`,
  });

  const errors = (res as any)?.body?.errors ?? [];
  if (errors.length > 0) {
    console.log(errors);
    // Sleep 10 seconds
    await new Promise((resolve) => setTimeout(resolve, 10000));
    return getShopifyProducts(cursor);
  }

  const products = (res as any)?.body?.data?.products?.edges ?? [];

  // Pretty print res
  return products;
}

async function appendResultToCsvFile(product, fileName = 'shopify-product.csv') {
  const modelNumber = product.node?.modelNumber?.value;
  const title = product.node?.title;
  const numberOfImages = product.node?.images?.edges?.length ?? 0;

  if (numberOfImages < 2) {
    console.log("Low number of images", modelNumber);
  }

  const escapedTitle = title?.replace(/"/g, '""');
  const escapedModelNumber = modelNumber?.replace(/"/g, '""');
  const csvLine = `${escapedModelNumber},${escapedTitle},${numberOfImages}\n`;
  fs.appendFileSync(fileName, csvLine);
}

async function main() {
  let cursor = 'eyJsYXN0X2lkIjo2OTc5MDUxNTg1NzMxLCJsYXN0X3ZhbHVlIjoiNjk3OTA1MTU4NTczMSJ9';
  let page = 398;
  while (true) {
    console.log(`Page ${page}`);
    const products = await getShopifyProducts(cursor);
    if (products.length === 0) {
      break;
    }
    for (const product of products) {
      await appendResultToCsvFile(product);
      cursor = product.cursor;
    }
    page++;
    console.log('Last cursor', cursor);
    // Sleep 10 seconds
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }
}

main();
