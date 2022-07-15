import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

import db from '../db';
import { fetchBestPricesWithModelNumber } from '../services/goat';

function escapedModelNumber(modelNumber: string) {
  return modelNumber.replace(/\//g, '_FS_SLASH_');
}

async function fetchPricesFromGoat(modelNumbers: string[]) {
  const collection = db.collection('goatPrices');

  for (const modelNumber of modelNumbers) {
    if (!modelNumber) {
      continue;
    }
    const prices = await fetchBestPricesWithModelNumber(modelNumber);
    if (!prices) {
      continue;
    }
    for (const price of prices) {
      price.modelNumber = modelNumber;

      price.updatedAt = new Date();
      price.isTopModel = true;

      const sku = `${modelNumber}-${price.sizeOption.value * 10}`;
      // Save to firestore
      try {
        const escaped = escapedModelNumber(sku);
        const skuDoc = collection.doc(escaped);

        await skuDoc.set(price);
      } catch (e) {
        console.error('Error saving goat price to firestore', e);
      }
      console.log(`Saved goat price for ${sku}`);
    }
  }
}

export async function processFromFile(filePath: string) {
  // Read file from file
  const modelNumbers = fs.readFileSync(filePath, 'utf8').split('\n');
  const hyphenated = modelNumbers.map((modelNumber) => {
    // Replace whitespace with hyphens
    return modelNumber.trim().replace(/\s+/g, '-');
  });
  console.log(`Found ${hyphenated.length} model numbers`);
  await fetchPricesFromGoat(hyphenated);
}
