import { Injectable } from '@nestjs/common';
import config from 'src/config';
import { PubSub } from '@google-cloud/pubsub';

@Injectable()
export class PubSubService {
  protected pubsubProjectId = config.pubsub.projectId;
  protected pubsubPrivateKey = config.pubsub.private_key;
  protected pubsubClientEmail = config.pubsub.client_email;
  protected keyfilename = config.pubsub.keyfilename;

  getPubSubClient(): PubSub {
    //const client = new PubSub({ keyFilename: this.keyfilename });

    const client =
      process.env.NODE_ENV == 'developement'
        ? new PubSub({
            keyFilename: this.keyfilename,
            projectId: this.pubsubProjectId,
            credentials: {
              private_key: this.pubsubPrivateKey.replace(/\\n/g, '\n'),
              client_email: this.pubsubClientEmail,
            },
          })
        : new PubSub({
            keyFilename: this.keyfilename,
            projectId: this.pubsubProjectId,
          });

    return client;
  }

  public async publishMessage(topicName: string, message): Promise<any> {
    const dataBuffer = Buffer.from(JSON.stringify(message));
    let messageId;
    try {
      messageId = await this.getPubSubClient()
        .topic(topicName)
        .publishMessage({ data: dataBuffer });
      console.log(`Message ${messageId} published.`);
    } catch (error) {
      console.error(`Received error while publishing: ${error.message}`);
      process.exitCode = 1;
    }
    return messageId;
  }
}
