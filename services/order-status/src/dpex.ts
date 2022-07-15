import fetch from 'node-fetch';
import { xml2json } from 'xml-js';
import * as querystring from 'querystring';

/**
 * 
 * @throws will throw an error if tracking number incorrect or Dpex server disconnected. 
 */
async function trackByDpexTrackNum(trackNum: string): Promise<Object[] | null> {
  const body = {
    txtWsVersionMethod: `service_ffdx.asmx/WSDataTransfer`,
    txtWsVersion: `https://ws05.ffdx.net/ffdx_ws/v12/`,
    Username: process.env.DPEX_USERNAME ?? null,
    Password: process.env.DPEX_PASSWORD ?? null,
    xmlStream: `
    <?xml version="1.0" encoding="ISO-8859-1" ?> 
    <WSGET>
      <AccessRequest> 
        <FileType>2</FileType>
        <Action>Download</Action>
        <EntityID>${process.env.DPEX_ENTITY_ID ?? null}</EntityID>
        <EntityPIN>${process.env.DPEX_ENTITY_PIN ?? null}</EntityPIN>  
      </AccessRequest>
      <ReferenceNumber>${trackNum}</ReferenceNumber>
      <ShowAltRef>Y</ShowAltRef>
    </WSGET>`.replace(/>\s*/g, '>').replace(/\s*</g, '<'), // Remove whitespaces between tags
    LevelConfirm: `Summary`,
  };
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  const url = `https://ws05.ffdx.net/ffdx_ws/v12/service_ffdx.asmx/WSDataTransfer`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: querystring.stringify(body),
    });
    const text = await response.text();
    // xml2json will return JSON string
    // Default response will wrapped by a <string> tag 
    const temp = JSON.parse(
      xml2json(text, { compact: true, spaces: 4 })
    );
    // get the real response -> data in the <string> tag
    const result = JSON.parse(
      xml2json(temp.string._text, { compact: true, spaces: 4 })
    );
    const events = result.WSGET.Event;
    return events;
  } catch (error) {
    console.error(error);
  }
  return null;
}

export default trackByDpexTrackNum;
