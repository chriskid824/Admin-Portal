export default {
  default: {
    requestedShipment: {
      pickupType: 'USE_SCHEDULED_PICKUP',
      serviceType: 'FEDEX_INTERNATIONAL_PRIORITY',
      packagingType: 'YOUR_PACKAGING',
      labelSpecification: {
        labelFormatType: 'COMMON2D',
        customerSpecifiedDetail: {
          maskedData: [
            'DUTIES_AND_TAXES_PAYOR_ACCOUNT_NUMBER',
            'TRANSPORTATION_CHARGES_PAYOR_ACCOUNT_NUMBER',
          ],
        },
        labelStockType: 'STOCK_4X6',
        imageType: 'PDF',
      },
    },
  },

  // by ship from country code / shipper.address.countryCode
  accountNumber: {
    HK: '740561073',
    // HK: '843818749',
    JP: '693545900',
  },

  countryOfManufacture: 'CN',
  currency: 'USD',

  customerReferences: [{
    customerReferenceType: 'CUSTOMER_REFERENCE',
    value: 'TC007_07_PT1_ST01_PK01_SNDUS_RCPCA_POS',
  }],

  dimensions: {
    length: 13,
    width: 26,
    height: 35,
    units: 'CM',
  },

  harmonizedCode: '6402190090',
  quantityUnits: 'EA',

  // by order.data['country']
  shipmentSpecialServices: {
    default: {
      specialServiceTypes: ['ELECTRONIC_TRADE_DOCUMENTS'],
      etdDetail: {
        requestedDocumentTypes: ['COMMERCIAL_INVOICE'],
      },
    },
    Colombia: null,
    Greece: null,
    Normay: null,
  },

  // by order.data['country']
  shippingDocumentSpecification: {
    default: {
      shippingDocumentTypes: ['COMMERCIAL_INVOICE'],
      commercialInvoiceDetail: {
        customerImageUsages: [
          {
            id: 'IMAGE_1',
            type: 'LETTER_HEAD',
          },
          {
            id: 'IMAGE_1',
            type: 'SIGNATURE',
          },
        ],
        documentFormat: {
          stockType: 'PAPER_LETTER',
          docType: 'PDF',
        },
      },
    },
    Colombia: {
      shippingDocumentTypes: ['COMMERCIAL_INVOICE'],
      commercialInvoiceDetail: {
        documentFormat: {
          stockType: 'PAPER_LETTER',
          docType: 'PDF',
        },
      },
    },
    Greece: {
      shippingDocumentTypes: ['COMMERCIAL_INVOICE'],
      commercialInvoiceDetail: {
        documentFormat: {
          stockType: 'PAPER_LETTER',
          docType: 'PDF',
        },
      },
    },
    Norway: {
      shippingDocumentTypes: ['COMMERCIAL_INVOICE'],
      commercialInvoiceDetail: {
        documentFormat: {
          stockType: 'PAPER_LETTER',
          docType: 'PDF',
        },
      },
    },
  },

  // by shipFromCode
  shipper: {
    hk: {
      address: {
        streetLines: [
          'Room A, Floor 28',
          'Goodman Dynamic Centre',
          '188 Yeung Uk Road, Tsuen Wan East',
        ],
        city: 'Tsuen Wan',
        stateOrProvinceCode: '',
        postalCode: '',
        countryCode: 'HK',
      },
      contact: {
        personName: 'KC Shipping Department',
        phoneNumber: '+852-2811-1210',
        // companyName: 'Kickscrew',
      },
    },
    jp: {
      address: {
        streetLines: ['1-7-1 RYUSEN,TAITO-KU'],
        city: 'TOKYO',
        stateOrProvinceCode: '',
        postalCode: '1100012',
        countryCode: 'JP',
      },
      contact: {
        personName: 'FUKUPLANNING C/O KICKSCREW',
        phoneNumber: '+81-3-6802-3582',
        // companyName: 'Kickscrew',
      },
    },
    jp2: {
      address: {
        streetLines: ['41-3 Nakairi Karausu'],
        city: 'Tsushima-shi Aichi-Pref',
        stateOrProvinceCode: '',
        postalCode: '496-0026',
        countryCode: 'JP',
      },
      contact: {
        personName: 'Fukuplanning Co.,Ltd. Tsushima-warehouse',
        phoneNumber: '+81-567-31-7160',
        // companyName: 'Kickscrew',
      },
    },
    jp3: {
      address: {
        streetLines: [
          '1F, 1-82-9 Takashimadaira',
          'Itabashi-ku'
        ],
        city: 'TOKYO',
        stateOrProvinceCode: '',
        postalCode: '1750082',
        countryCode: 'JP',
      },
      contact: {
        personName: 'KICKSCREW Itabashi-ku-warehouse',
        phoneNumber: '080-9551-0034',
        // companyName: 'Kickscrew',
      },
    },
  },

  shippingChargesPaymentType: 'SENDER',

  weight: {
    units: 'KG',
    value: 1.6,
  },

  // payload config
  streetLinesMaxLength: 35,
};
