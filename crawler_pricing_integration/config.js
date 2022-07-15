require('dotenv').config();
const env = process.env;
const db = {
  host: env.DB_HOST,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_DATABASE,
}

exports.db = db;

const projectId = env.PROJECT_ID;
exports.projectId = projectId;

const pubsub = {
  TOPICNAME_PRICE: env.TOPICNAME_PRICE,
  TOPICNAME_STOCK: env.TOPICNAME_STOCK,
  TOPICNAME_IMAGE: env.TOPICNAME_IMAGE,
}

exports.pubsub = pubsub;

const firestore = {
  projectId: env.PROJECTID,
  keyFilename: env.KEYFILENAME,
  collection: env.COLLECTION,
  doc: env.DOC
}

exports.firestore = firestore;
