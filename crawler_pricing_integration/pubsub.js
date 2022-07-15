const config = require('./config.js');
const { PubSub } = require('@google-cloud/pubsub');

// Creates a client; cache this for further use
const pubSubClient = new PubSub({ projectId: config.projectId });
const TOPICNAME_PRICE = config.pubsub.TOPICNAME_PRICE;
const TOPICNAME_STOCK = config.pubsub.TOPICNAME_STOCK;
const topicObjects = {};

function getTopic(topicType) {
  if (topicObjects.hasOwnProperty(topicType)) return topicObjects[topicType];
  let topicName;
  if (topicType == 'price') topicName = TOPICNAME_PRICE;
  else topicName = TOPICNAME_STOCK;
  const topic = topicObjects[topicType] = pubSubClient.topic(topicName);
  return topic;
}

async function publishMessage(topic, data) {
  const dataBuffer = Buffer.from(data);
  try {
    const messageId = await getTopic(topic).publishMessage({ data: dataBuffer });
    //console.log(`Message ${messageId} published.`);
  } catch (error) {
    console.error(`Received error while publishing: ${error.message}`);
    process.exitCode = 1;
  }
}

exports.pubSubClient = pubSubClient;
exports.publishMessage = publishMessage;
