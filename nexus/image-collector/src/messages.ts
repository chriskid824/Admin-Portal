import { publishMessage } from './pubsub.js';

const imageSinkUpdateTopic = process.env.IMAGE_SINK_UPDATE_TOPIC ?? '';
export async function publishToSink(modelNumber: string, imageUrls: Array<string>) {
  const data = {
    modelNumber,
    imageUrls,
  };
  await publishMessage(data, imageSinkUpdateTopic);
}

