import admin from 'firebase-admin';
admin.initializeApp();
const firestore = admin.firestore();

const collection = firestore.collection('ServiceStatus');

async function get(key: string) {
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

async function set(key: string, value: any) {
  if (!key) {
    throw new Error('key is required');
  }
  const ref = collection.doc(key);
  await ref.set({ value });
}

export default { get, set };
