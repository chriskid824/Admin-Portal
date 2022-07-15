const { Firestore, Timestamp } = require('@google-cloud/firestore');
const store = new Firestore();
const collection = store.collection('ServiceStatus');

async function get(key) {
  if (!key) {
    throw new Error('key is required');
  }
  const ref = collection.doc(key);
  const doc = await ref.get();
  if (doc.exists) {
    const data = doc.data();
    if (!data) {
      return null;
    } else {
      return data.value ?? null;
    }
  } else {
    return null;
  }
}

async function set(key, value) {
  if (!key) {
    throw new Error('key is required');
  }
  const ref = collection.doc(key);
  await ref.set({ value });
}

module.exports = { get, set };

