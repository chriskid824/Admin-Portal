require('dotenv').config();
const env = process.env;

const gql = require('gql-query-builder');
const Shopify = require('@shopify/shopify-api').Shopify;


function buildId(id, type) {
  return `gid://shopify/${type}/${id}`;
}

function buildIdObject(id, type, name) {
  name = name ?? 'id';
  return {
    name,
    type: 'ID',
    value: buildId(id, type),
    required: true,
  };
}

const client = new Shopify.Clients.Graphql(env.API_SUBDOMAIN, env.API_PASSWORD);
const locationId = buildIdObject(env.SHOPIFY_LOCATION_ID, 'Location', 'locationId');

const baseSourceMetafield = {
  namespace: 'price_stock',
  key: 'source',
  type: 'single_line_text_field',
};

async function query(query) {
  const res = await client.query({ data: query });
  if (res.body.extensions) {
    console.log(res.body.extensions.cost);
  }
  if (res.body.errors) {
    const errMsg = res.body.errors.reduce((msg, e) => {
      console.log(e.message, e.locations);
      return msg + e.message + ' ; ';
    }, '');
    throw new Error(errMsg);
  }
  return res;
}

async function bulkQueryVariantAndInventory(ids, variantFields, inventoryFields) {
  let bulkQueryData = [];
  for (const item of ids) {
    const { variantId: id, inventoryItemId } = item;
    bulkQueryData = [
      ...bulkQueryData,
      { // query product variant `metafields`
        operation: `ProductVariant${id}: productVariant`, // workaround for alias
        variables: {
          [`id${id}`]: buildIdObject(id, 'ProductVariant'),
        },
        fields: variantFields
      },
      { // query inventory level `available`
        operation: `InventoryItem${id}: inventoryItem`, // workaround for alias
        variables: {
          [`inventoryId${id}`]: buildIdObject(inventoryItemId, 'InventoryItem'),
        },
        fields: [{
          operation: 'inventoryLevel',
          variables: { locationId },
          fields: inventoryFields
        }]
      }
    ];
  }
  const queryObj = gql.query(bulkQueryData);
  const queryRes = await query(queryObj);
  return queryRes.body.data;
}

async function bulkUpdateVariantAndInventory(updateData) {
  // bulk query Shopify for source metafield ID and current inventory availability
  const variantFields = [{
    operation: 'metafields',
    fields: [{ edges: [{ node: ['id', 'key'] }] }],
    variables: {
      first: 2
    },
  }];
  const inventoryFields = ['available'];
  const queryResData = await bulkQueryVariantAndInventory(
    updateData,
    variantFields,
    inventoryFields
  );

  // bulk mutation to Shopify
  const bulkVariantMap = {};
  const bulkInventoryData = [];
  for (const item of updateData) {
    const { productId, variantId: id, inventoryItemId, price, qty, source } = item;
    const variant = queryResData[`ProductVariant${id}`];
    const inventory = queryResData[`InventoryItem${id}`].inventoryLevel;
    const sourceMetafield = Object.assign({}, baseSourceMetafield, {
      value: source,
    });
    variant.metafields.edges.find(({ node: { id, key } }) => {
      if (key === 'source') {
        sourceMetafield['id'] = id;
        return true;
      }
    });

    if (!bulkVariantMap.hasOwnProperty(productId)) {
      bulkVariantMap[productId] = {
        operation: `ProductVariantBulkUpdate${productId}: productVariantsBulkUpdate`,
        variables: {
          [`productId${productId}`]: buildIdObject(productId, 'Product', 'productId'),
          [`variants${productId}`]: {
            name: 'variants',
            value: [],
            type: '[ProductVariantsBulkInput!]',
            required: true,
          },
        },
        fields: [{
          productVariants: ['id', 'price'],
        }]
      }
    }

    bulkVariantMap[productId].variables[`variants${productId}`].value.push({
      id: buildId(id, 'ProductVariant'),
      metafields: [sourceMetafield],
      price,
    });

    if (qty !== inventory.available) { // only update if not the same
      bulkInventoryData.push({
        inventoryItemId: buildId(inventoryItemId, 'InventoryItem'),
        availableDelta: qty - inventory.available,
      });
    }
  }
  
  const mutationData = [...Object.values(bulkVariantMap)];
  if (bulkInventoryData.length > 0) {
    mutationData.push({
      operation: 'inventoryBulkAdjustQuantityAtLocation',
      variables: {
        inventoryItemAdjustments: {
          value: bulkInventoryData,
          type: '[InventoryAdjustItemInput!]',
          required: true,
        },
        locationId 
      },
      fields: [{
        inventoryLevels: ['id', 'available'],
      }]
    });
  }
  const mutationObj = gql.mutation(mutationData);
  const mutationRes = await query(mutationObj);
  return mutationRes.body;
}

module.exports = {
  bulkUpdateVariantAndInventory
};
