const firestore = require('./firestore');
const pubsub = require('./pubsub.js');
const db = require('./db');

// @returns {Promise<Object>} lastCheckTime and lastModelNumber
async function getLastSpuCheckTime() {
  const collection = firestore.db.collection('ServiceStatus');
  const ref = collection.doc('lastSpuCheckTime');
  const doc = await ref.get();
  if (doc.exists) {
    const lastCheckTime = doc.data().time ?? Math.floor(Date.now() / 1000);
    const lastModelNumber = doc.data().modelNumber ?? '';
    return { lastCheckTime, lastModelNumber };
  } else {
    return {
      lastCheckTime: Math.floor(Date.now() / 1000),
      lastModelNumber: '',
    };
  }
}

// @param newLastCheckTime {number} lastCheckTimeStamp in seconds
async function updateLastSpuCheckTime(newLastCheckTime, newLastModelNumber) {
  const collection = firestore.db.collection('ServiceStatus');
  const ref = collection.doc('lastSpuCheckTime');
  await ref.set({
    time: newLastCheckTime,
    modelNumber: newLastModelNumber,
  });
}

async function getUpdatedSpuSinceLastCheckTime(lastCheckTime, lastModelNumber) {
  // We avoid reading record updated too recently since records might be added
  // in the same second after we read them.
  const query = `SELECT
    title,
    udt,
    UNIX_TIMESTAMP(udt) AS udtTimestamp,
    article_number as modelNumber,
    spu_logo as spuLogo,
    spu_id as spuId,
    category_id as categoryId
    FROM spus
    WHERE
      udt < NOW() - INTERVAL 10 SECOND &&
      (
        udt > FROM_UNIXTIME(?) ||
        (udt >= FROM_UNIXTIME(?) AND article_number > ?)
      )
    ORDER BY udt ASC, modelNumber ASC
    LIMIT 500`;
  return db.query(query, [lastCheckTime, lastCheckTime, lastModelNumber]);
}

function extOfUrl(url) {
  const parts = url.split('.');
  let ext = parts[parts.length - 1];
  if (!ext) {
    throw new Error(`No extension found in ${url}`);
  }

  ext = ext.toLowerCase();
  if (ext !== 'jpg' && ext !== 'jpeg' && ext !== 'png' && ext !== 'gif') {
    // Assume jpg as some images don't have an extension
    return 'jpg';
  }
  return ext;
}

/**
 * Update images in firestore if it has changed
 * @param modelNumber {string}
 * @param images {Array<Object>}
 * @returns {Promise<boolean>} true if image has changed
 */
async function updateImagesIfChanged(modelNumber, images) {
  const collection = firestore.db.collection('spuImages');
  const ref = collection.doc(firestore.cleanDocAddress(modelNumber));
  const doc = await ref.get();

  let changed = true;
  if (doc.exists) {
    changed = false;
    const data = doc.data();
    const currentImages = data?.images;
    if (!Array.isArray(currentImages)) {
      changed = true;
    } else if (currentImages.length !== images.length) {
      console.log('Number of images changed', modelNumber, images.length);
      changed = true;
    } else {
      const currentSorted = currentImages.map((item) => item.url).sort();
      const newSorted = images.map((item) => item.url).sort();
      for (let i = 0; i < currentSorted.length; i++) {
        if (currentSorted[i] !== newSorted[i]) {
          changed = true;
          break;
        }
      }
    }
  }

  if (changed) {
    console.log(`Images changed for ${modelNumber}`);
    await ref.set({
      modelNumber,
      images,
      updatedAt: new Date(),
    });
  }
  return changed;
}

function isShoe(row) {
  const shoeCategoryIds = [
    33, // Running shoes
    38, // Skateboarding shoes
    31, // Basketball Shoes
    46, // Slippers
    37, // Casual Shoes (e.g. Converse, Vans)
    1001176, // Basketball Shoes
    34, // Trainers
    45, // Sandals
    1001189, // Running Shoes
    1000596, // Running Shoes
    36, // Clunky Sneakers
    32, // Soccer Shoes
    43, // Outdoor boots
    41, // Snow boots
    44, // Dr. Martens
    1000276, // Outdoor functional shoes
    40, // Lazy Shoes
    1001046, // Sneakers
    1000269, // Single shoes ??
    1000270, // Slippers
    1000263, // ??
    1001044, // Basketball shoes
    1001178,
    1001177,
  ];
  return shoeCategoryIds.includes(row.categoryId);
}

async function processSpuRow(row) {
  // Skip SPU that model number doesn't contain alphanumeric characters
  if (row.modelNumber.replace(/[^a-zA-Z0-9]/g, '').trim().length === 0) {
    console.log(`Skipping item without alphanumeric characters ${row.title}, ${row.modelNumber}`);
    return;
  }

  const productType = isShoe(row) ? 'shoe' : '';
  const message = {
    modelNumber: row.modelNumber,
    source: 'du',
    images: [],
    productType,
  };

  // Main image
  try {
    const mainExt = extOfUrl(row.spuLogo);
    message.images.push({
      name: `main.${mainExt}`,
      url: row.spuLogo,
    });
  } catch (err) {
    console.error(err);
  }

  // Other images
  const images = await db.query(
    `SELECT url, sequence, udt
      FROM spus_images
      WHERE spu_id = ?
      ORDER BY udt DESC`,
    [row.spuId],
  );
  let lastUdt = null;
  const sequenceSet = new Set();
  for (const image of images) {
    // Check if we already have this sequence
    const sequence = image.sequence;
    if (sequenceSet.has(sequence)) {
      continue;
    }
    sequenceSet.add(sequence);

    // Check if the next image is fetch from another period
    // Get second difference between udt and lastUdt
    if (lastUdt === null) {
      lastUdt = image.udt;
    } else {
      const diff = lastUdt ? lastUdt.getTime() - image.udt.getTime() : 0;
      const msInDay = 1000 * 60 * 60 * 24;
      if (diff > msInDay) {
        break;
      }
      lastUdt = image.udt;
    }
    try {
      const ext = extOfUrl(image.url);
      message.images.push({
        name: `${sequence}.${ext}`,
        url: image.url,
      });
    } catch (err) {
      console.error(err);
    }
  }

  // Skip if images have not changed
  if (!await updateImagesIfChanged(row.modelNumber, message.images)) {
    console.log(`Skipping ${row.title}, ${row.modelNumber} that images ` +
      `have not changed`);
    return;
  }

  console.log(`Creating task for ${row.title}, ${row.modelNumber}`);
  return pubsub.pubSubClient.topic('image-source-update').publishMessage({
    data: Buffer.from(JSON.stringify(message)),
  });
}

async function syncSpu() {
  console.log('syncSpu starts');
  // Get last SPU check time from firestore
  const { lastCheckTime, lastModelNumber } = await getLastSpuCheckTime();
  console.log('lastSpuCheckTime', lastCheckTime);
  console.log('lastModelNumber', lastModelNumber);

  // Get SPU data from DB
  const spuData = await getUpdatedSpuSinceLastCheckTime(
    lastCheckTime,
    lastModelNumber,
  );
  console.log(`syncSpu: ${spuData.length} SPUs found`);

  // Publish messages to pubsub
  const promises = spuData.map(processSpuRow);
  await Promise.all(promises);

  // Update last SPU check time in firestore
  const lastRow = spuData[spuData.length - 1];
  if (lastRow) {
    const newLastCheckTime = lastRow.udtTimestamp;
    const newLastModelNumber = lastRow.modelNumber;
    console.log('newSpuLastCheckTime', lastRow.udt, newLastCheckTime);
    console.log('newSpuLastModelNumber', newLastModelNumber);
    await updateLastSpuCheckTime(newLastCheckTime, newLastModelNumber);
  }
}

async function syncAllSpu(numTasks, startPage = 0) {
  const pageSize = 1000;
  let page = startPage;

  while (pageSize * page < numTasks) {
    const offset = page * pageSize;
    const limit = Math.min(numTasks - offset, pageSize);
    console.log(`Fetching page ${page}...`);
    const query = `SELECT
      title,
      udt,
      UNIX_TIMESTAMP(udt) AS udtTimestamp,
      article_number as modelNumber,
      spu_logo as spuLogo,
      spu_id as spuId,
      category_id as categoryId
      FROM spus
      LIMIT ? OFFSET ?`;
    const rows = await db.query(query, [limit, offset]);
    for (const row of rows) {
      await processSpuRow(row);
    }
    page++;
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  syncSpu,
  syncAllSpu,
  updateImagesIfChanged,
};
