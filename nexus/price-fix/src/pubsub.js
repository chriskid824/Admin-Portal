const { PubSub } = require('@google-cloud/pubsub');
const pubsub = new PubSub();

const publishMessage = async (message, topicName) => {
  if (typeof(message) !== 'string')
    message = JSON.stringify(message);

  const topic = pubsub.topic(topicName);
  const data = Buffer.from(message);

  const callback = (err, messageId) => {
    if (err) {
      const errMsg = `[${messageId}] unable to publish message to ${topicName}`;
      console.error(err);
      throw new Error(errMsg);
    }
  };

  topic.publishMessage({data}, callback);
}

module.exports = publishMessage;
