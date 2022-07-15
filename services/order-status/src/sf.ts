import fetch from 'node-fetch';
import * as querystring from 'querystring';
import crypto from 'crypto';
require('dotenv').config();
const md5 = crypto.createHash('md5');

async function trackBySFTrackNum(trackNum, phoneNum): Promise<Object[] | null> {
  const msgData = JSON.stringify({
    language: '0',
    trackingType: '1',
    trackingNumber: trackNum,
    methodType: '1',
    checkPhoneNo: phoneNum,
  });
  const reqURL = 'http://sfapi.sf-express.com/std/service/';
  const requestID = crypto.randomUUID().split('-').join('');
  const partnerID = process.env.partnerID;
  const checkword = process.env.checkword;
  const serviceCode = 'EXP_RECE_SEARCH_ROUTES';
  const timestamp = new Date().getTime();
  const encodestr = querystring.escape(msgData + timestamp + checkword);
  const msgDigest = md5.update(encodestr).digest('base64');

  const data = {
    partnerID: partnerID,
    requestID: requestID,
    serviceCode: serviceCode,
    timestamp: timestamp,
    msgDigest: msgDigest,
    msgData: msgData,
  };

  const headersOpt = {
    'content-type': 'application/x-www-form-urlencoded',
  };

  try {
    const response = await fetch(reqURL, {
      method: 'POST',
      headers: headersOpt,
      body: querystring.stringify(data),
    });
    const text = await response.text();
    const result = JSON.parse(text);
    return result;
  } catch (error) {
    console.log(error);
  }
  return null;
}

export default trackBySFTrackNum;
