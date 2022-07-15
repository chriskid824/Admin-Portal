import { PubSub } from '@google-cloud/pubsub';
const pubsub = new PubSub();

export async function publishMessage(message, topicName) {
  if (typeof(message) !== 'string') {
    message = JSON.stringify(message);
  }

  const topic = pubsub.topic(topicName);
  const data = Buffer.from(message);

  await topic.publishMessage({data});
}
