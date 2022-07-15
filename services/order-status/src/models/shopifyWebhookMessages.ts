import db from '../db';

export class ShopifyWebhookMessages { 
  static async findByOrderId(orderId: string) {
    const shopifyCollection = db.collection('shopifyWebhookMessages');
    const shopifyDocs = await (shopifyCollection.where('orderId', '==', orderId).where('topic', '==', 'orders/fulfilled')).limit(1).get();
    if (shopifyDocs.empty) {
      console.log('No matching documents.');
      return;
    }
    return shopifyDocs.docs[0].data();
  }
}
