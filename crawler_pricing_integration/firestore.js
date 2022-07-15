const config = require('./config.js');
const Firestore = require('@google-cloud/firestore');

const db = new Firestore();
const collection = db.collection(config.firestore.collection);

function cleanDocAddress(docAddress) {
  return docAddress.replace(/\//g, '_FS_SLASH_');
}
exports.cleanDocAddress = cleanDocAddress;

async function getFirestoreDoc(docAddress) {
  const cleanAddress = cleanDocAddress(docAddress);
  const ref = collection.doc(cleanAddress);
  const doc = await ref.get();
  return doc.exists ? doc.data() : {};
}
exports.getFirestoreDoc = getFirestoreDoc;

async function setFirestoreDoc(docAddress, data) {
  const cleanAddress = cleanDocAddress(docAddress);
  const ref = collection.doc(cleanAddress);
  return ref.set(data);
}
exports.setFirestoreDoc = setFirestoreDoc;

async function getFirestoreLastCheck() {
  return await getFirestoreDoc(config.firestore.doc);
}
exports.getFirestoreLastCheck = getFirestoreLastCheck;

async function updateFirestoreLastCheck(data) {
  setFirestoreDoc(config.firestore.doc, data);
}
exports.updateFirestoreLastCheck = updateFirestoreLastCheck;

exports.db = db;
