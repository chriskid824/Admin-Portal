import dotenv from 'dotenv';
dotenv.config();

const env = process.env;

export default {
  imageBucket: env.IMAGE_BUCKET ?? 'kscw-product-image-a7tp',
  imageSinkUpdateTopic:
    env.IMAGE_SINK_UPDATE_TOPIC ??
    'projects/kscw-nexus-a7tp-stg/topics/image-source-update',
};
