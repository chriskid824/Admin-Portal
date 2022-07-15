import fetch from 'node-fetch';
let expiryTime = new Date();
let accessToken;
export class fedEx {
  /**
   * 
   * @throws will throw an error if client Id and secret key incorrect or Dpex server disconnected.  
   */
  static async getFedExToken() {
    if ((!accessToken) || expiryTime <= new Date()) {
      const fedexAPI = {
        key: process.env.FEDEX_CLIENT_ID ?? null,
        password: process.env.FEDEX_SECRET_KEY ?? null,
      };
      const url = `https://apis.fedex.com/oauth/token`;
      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
      };
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: headers,
          body: `grant_type=client_credentials&client_id=${fedexAPI.key}&client_secret=${fedexAPI.password}`,
        });
        const json = await response.json();
        if (json.access_token) {
          accessToken = json.access_token;
          expiryTime = new Date(expiryTime.getTime() + (1000 * 1800))
          console.log('New FedEx accessToken generated!');
          console.log('FedEx accessToken expiryTime: ', expiryTime);
        }
      } catch (error) {
        console.error(error);
      }
    }
    return accessToken;
  }

  /**
   * 
   * @throws will throw an error if tracking number incorrect or Fedex server disconnected.  
   */
  static async trackByFedExTrackNum(trackNum) {
    const accessToken = await this.getFedExToken();
    const payload = {
      trackingInfo: [
        {
          trackingNumberInfo: {
            trackingNumber: `${trackNum}`,
          },
        },
      ],
      includeDetailedScans: true,
    };
    const url = 'https://apis.fedex.com/track/v1/trackingnumbers';
    const headers = {
      'Content-Type': 'application/json',
      'X-locale': 'en_US',
      Authorization: `Bearer ${accessToken}`,
    };
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
      });
      if (response.status == 200) {
        const json = await response.json();
        return json;
      }
    } catch (error) {
      console.error(error);
    }
    return null;
  }
}
