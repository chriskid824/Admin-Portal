export enum Courier {
  DPEX = 'Dpex',
  EMS = 'EMS',
  FEDEX = 'FedEx',
  ARAMEX = 'Aramex',
  ZTO = 'ZTO',
  SFHK = 'SF-HK',
}

export default {
  courier: {
    AU: Courier.DPEX,   // Australia
    ID: Courier.EMS,    // Indonesia
    IN: Courier.FEDEX,  // India
    BR: Courier.FEDEX,  // Brazil
    BN: Courier.DPEX,   // Brunei
    CA: Courier.FEDEX,  // Canada
    CZ: Courier.FEDEX,  // Czech Republic
    DK: Courier.FEDEX,  // Denmark
    FI: Courier.FEDEX,  // Finland
    FR: Courier.FEDEX,  // France
    GR: Courier.FEDEX,  // Greece
    GU: null,           // Guam
    HU: Courier.FEDEX,  // Hungary
    IS: Courier.FEDEX,  // Iceland
    IT: Courier.FEDEX,  // Italy
    JP: Courier.EMS,    // Japan
    KR: Courier.FEDEX,  // South Korea
    MY: Courier.FEDEX,  // Malaysia
    MX: Courier.FEDEX,  // Mexico
    NL: Courier.FEDEX,  // Netherlands
    NZ: Courier.FEDEX,  // New Zealand
    NO: Courier.FEDEX,  // Norway
    PL: Courier.FEDEX,  // Poland
    PT: Courier.FEDEX,  // Portugal
    RU: Courier.FEDEX,  // Russia
    SG: Courier.FEDEX,  // Singapore
    ES: Courier.FEDEX,  // Spain
    SE: Courier.FEDEX,  // Sweden
    CH: Courier.FEDEX,  // Switzerland
    TW: Courier.FEDEX,  // Taiwan
    TH: Courier.EMS,    // Thailand
    TR: Courier.FEDEX,  // Turkey
    GB: Courier.FEDEX,  // United Kingdom
    US: Courier.FEDEX,  // United States
    VN: Courier.EMS,    // Vietnam
    AE: Courier.ARAMEX, // United Arab Emirates
    CN: Courier.ZTO,    // China
    HK: Courier.SFHK,   // Hong Kong
    IL: Courier.FEDEX,  // Israel
    MN: Courier.FEDEX,  // Mongolia/Mongo
    DE: Courier.FEDEX,  // Germany
    MO: Courier.SFHK,   // Macau
    PH: Courier.FEDEX,  // Philippines
    BE: Courier.FEDEX,  // Belgium
    IE: Courier.FEDEX,  // Ireland
    VI: null,           // Virgin Islands
    AT: Courier.FEDEX,  // Austria
    VE: null,           // Venezuela
    PR: null,           // Puerto Rico
    SA: Courier.ARAMEX, // Saudi Arabia
    CO: Courier.FEDEX,  // Colombia
    AR: Courier.FEDEX,  // Argentina
    SI: Courier.FEDEX,  // Slovenia (Republic of)
    SK: Courier.FEDEX,  // Slovak Republic (Slovakia)
  }
}