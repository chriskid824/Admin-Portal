const env = process.env;

// TODO: Centralize all access to process.env in this file, if possible.

const extendedDb = {
  type: '',
  host: '',
  username: '',
  password: '',
  database: '',
  port: 3306,
  entities: ['dist/**/*.entity.js'],
  synchronize: false,
  migrationsRun: true,
  migrations: ['dist/db/migrations/*.js'],
  cli: {
    migrationsDir: 'src/db/migrations',
  },
};

const isStaging = env.NODE_ENV === 'staging';
const isProduction = env.NODE_ENV === 'production';
console.log(`NODE_ENV: ${env.NODE_ENV}`);
if (isStaging || isProduction) {
  // Add mysql config to extendedDb
  extendedDb.type = 'mysql';
  extendedDb.host = env.EXTENDED_DB_HOST;
  extendedDb.username = env.EXTENDED_DB_USER;
  extendedDb.password = env.EXTENDED_DB_PASSWORD;
  extendedDb.database = env.EXTENDED_DB_DATABASE;
  extendedDb.port = env.EXTENDED_DB_PORT
    ? parseInt(env.EXTENDED_DB_PORT)
    : 3306;
} else {
  // Add sqlite config to extendedDb
  extendedDb.type = 'sqlite';
  extendedDb.database = 'db.sqlite3';
}

export default {
  isStaging,
  baseUrl: env.BASE_URL ?? '',

  db: {
    host: env.DB_HOST ?? 'localhost',
    username: env.DB_USER ?? 'root',
    password: env.DB_PASSWORD ?? '',
    database: env.DB_DATABASE ?? 'test',
    port: env.DB_PORT ? parseInt(env.DB_PORT) : 3306,
    type: 'mysql',
    name: 'backend',
    entities: ['dist/entities/legacy/*.entity.js'],
  },
  snkrdunkdb: {
    host: env.DB_HOST ?? 'localhost',
    username: env.DB_USER ?? 'root',
    password: env.DB_PASSWORD ?? '',
    database: env.SNKRDUNK_DB_DATABASE ?? 'test',
    port: env.DB_PORT ? parseInt(env.DB_PORT) : 3306,
    type: 'mysql',
    name: 'snkrdunkdb',
    entities: ['dist/entities/legacy/*.entity.js'],
  },
  shopifydb: {
    host: env.DB_HOST ?? 'localhost',
    username: env.DB_USER ?? 'root',
    password: env.DB_PASSWORD ?? '',
    database: env.SHOPIFY_DB_DATABASE ?? 'test',
    port: env.DB_PORT ? parseInt(env.DB_PORT) : 3306,
    type: 'mysql',
    name: 'shopify',
    entities: ['dist/entities/legacy/*.entity.js'],
  },
  // Stores additional information out of the existing database
  extendedDb,

  // auth jwt secret
  auth: {
    secret: env.AUTH_SECRET ?? 'secretKey',
    session_secret: env.SESS_SECRET ?? 'random session key',
    admin_password: env.ADMIN_PASSWORD ?? 'superadminpassword',
  },

  // build versioning info
  buildInfo: {
    time: env.BUILD_TIME ? parseInt(env.BUILD_TIME) * 1000 : '',
    commit: env.BUILD_COMMIT ?? '',
  },

  shopify: {
    password: env.SHOPIFY_API_PASSWORD ?? '',
    subDomain: env.SHOPIFY_API_SUBDOMAIN ?? '',
  },

  erp: {
    secret: env.ERP_SECRET ?? '',
    appkey: env.ERP_APPKEY ?? '',
    sessionkey: env.ERP_SESSIONKEY ?? '',
    erp_updateMethod: env.ERP_UpdateMethod ?? '',
  },

  fedex: {
    host: {
      default: env.FEDEX_API_HOST ?? '',
      tradeDocumentsUpload: env.FEDEX_DOCUMENT_API_HOST ?? '',
    },
    id: env.FEDEX_CLIENT_ID ?? '',
    secret: env.FEDEX_CLIENT_SECRET ?? '',
  },

  // legacy backend
  backend: {
    var: env.BACKEND_API_VAR ?? '',
    key: env.BACKEND_API_KEY ?? '',
  },

  pubsub: {
    projectId: env.PUBSUB_PROJECT_ID ?? '',
    private_key: env.PUBSUB_PRIVATE_KEY ?? '',
    client_email: env.PUBSUB_CLIENT_EMAIL ?? '',
    keyfilename : env.KEYFILENAME,
  },

  googleOAuth: {
    clientId: env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: env.GOOGLE_CLIENT_SECRET ?? '',
  },

  pubsubTopic: {
    productUpdate: { topicName: 'product-sink-update' },
  },

  nexus: {
    apiHost: env.NEXUS_API_HOST ?? '',
    priceEngineUrl: env.NEXUS_PRICE_ENGINE_URL ?? '',
  },

  image: {
    bucket: env.IMAGE_BUCKET ?? ''
  }
};
