const orderFilterData = {
  status: [
    {
      value: 'Success',
      displayText: 'Success',
    },
    {
      value: 'Success2',
      displayText: 'Order confirmed (Success2)',
    },
    {
      value: 'GX-Buying',
      displayText: 'GX-Buying',
    },
    {
      value: 'Address',
      displayText: 'Address',
    },
    {
      value: 'Buying',
      displayText: 'Buying',
    },
    {
      value: 'Cancel',
      displayText: 'Cancel',
    },
    {
      value: 'Returned',
      displayText: 'Returned',
    },
    {
      value: 'Hold',
      displayText: 'Hold',
    },
    {
      value: 'Ordering',
      displayText: 'Ordering',
    },
    {
      value: 'Black List',
      displayText: 'Black List',
    },
    {
      value: 'Asking',
      displayText: 'Asking',
    },
    {
      value: 'Verify',
      displayText: 'Verify',
    },
    {
      value: 'Please Refund',
      displayText: 'Please Refund',
    },
    {
      value: 'Shipped',
      displayText: 'Shipped',
    },
    {
      value: 'Pre-order',
      displayText: 'Pre-order',
    },
    {
      value: 'Uncleared',
      displayText: 'Uncleared',
    },
    {
      value: 'Stocking',
      displayText: 'Stocking',
    },
    {
      value: 'Finding',
      displayText: 'Finding',
    },
    {
      value: 'Case-Shipped',
      displayText: 'Case-Shipped',
    },
    {
      value: 'Case-NotShip',
      displayText: 'Case-NotShip',
    },
    {
      value: 'Temp',
      displayText: 'Temp',
    },
    {
      value: 'Pending',
      displayText: 'Pending',
    },
    {
      value: 'Xwarehouse Ship',
      displayText: 'Xwarehouse Ship',
    },
    {
      value: 'WX-Stocking',
      displayText: 'WX-Stocking',
    },
    {
      value: 'HK-Buying',
      displayText: 'HK-Buying',
    },
    {
      value: 'DU-Buying',
      displayText: 'DU-Buying',
    },
    {
      value: 'Nice-Buying',
      displayText: 'Nice-Buying',
    },
    {
      value: 'TB-Buying',
      displayText: 'TB-Buying',
    },
    {
      value: 'DU-Buying-FAST',
      displayText: 'DU-Buying-FAST',
    },
    {
      value: 'Nice-Buying-FAST',
      displayText: 'Nice-Buying-FAST',
    },
    {
      value: 'Can-Ship',
      displayText: 'Can-Ship',
    },
    {
      value: 'SH-Buying',
      displayText: 'SH-Buying',
    },
    {
      value: 'Dam-Buying',
      displayText: 'Dam-Buying',
    },
    {
      value: 'Dam-WX-Stocking',
      displayText: 'Dam-WX-Stocking',
    },
    {
      value: 'Payment Review',
      displayText: 'Payment Review',
    },
    {
      value: 'Verify-riskified',
      displayText: 'Verify-riskified',
    },
    {
      value: 'Asking-riskified',
      displayText: 'Asking-riskified',
    },
    {
      value: 'ETW-Buying',
      displayText: 'ETW-Buying',
    },
    {
      value: 'Photo',
      displayText: 'Photo',
    },
    {
      value: 'Need Ops Review',
      displayText: 'Need Ops Review',
    },
    {
      value: 'Wrong Price',
      displayText: 'Wrong Price',
    },
    {
      value: 'Partially Shipped',
      displayText: 'Partially Shipped',
    },
    {
      value: 'Discount-Defect',
      displayText: 'Discount-Defect',
    },
    {
      value: 'Discount-Delay',
      displayText: 'Discount-Delay',
    },
    {
      value: 'TW-Buying',
      displayText: 'TW-Buying',
    },
    {
      value: 'Can-Ship-Dam',
      displayText: 'Can-Ship-Dam',
    },
  ],
  erpstatus: [
    { value: '3', displayText: '已發貨' },
    { value: '2', displayText: '已配貨' },
    { value: '1', displayText: '已入單' },
    { value: '0', displayText: '未入單' },
    { value: '4', displayText: '多個SDO' },
    { value: '5', displayText: 'Canceled/refunded' },
    { value: '6', displayText: 'Not Canceled/refunded' }
  ],
  shipment2: [
    { value: 'Goat', displayText: 'Goat' },
    { value: 'FedEx', displayText: 'FedEx' },
    { value: 'DHL', displayText: 'DHL' },
    { value: 'UPS', displayText: 'UPS' },
    { value: 'LK', displayText: 'LK' },
    { value: 'Easyship', displayText: 'Easyship' },
    { value: 'SF-HK', displayText: 'SF-HK' },
    { value: 'EMS', displayText: 'EMS' },
    { value: 'ZTO', displayText: 'ZTO' },
    { value: 'Airmail', displayText: 'AIR MAIL' },
    { value: 'Self-Pick', displayText: 'Self-Pick' },
    { value: 'Unkown', displayText: 'Unkown' },
    { value: 'Blocked', displayText: 'Blocked' },
    { value: 'none', displayText: 'None' }
  ],
  paypal_return_status: [
    { value: 'pdcptb', displayText: 'pdcptb' },
    { value: 'paypal_express', displayText: 'paypal_express' },
    { value: 'payflow_express', displayText: 'payflow_express' },
    { value: 'payflowpro', displayText: 'payflowpro' },
    { value: 'stripeinstantcheckout', displayText: 'stripeinstantcheckout' },
    { value: 'braintree_applepay', displayText: 'braintree_applepay' },
    { value: 'braintree_googlepay', displayText: 'braintree_googlepay' },
    { value: 'braintree', displayText: 'braintree' },
    { value: 'braintree_paypal', displayText: 'braintree_paypal' },
    { value: 'banktransfer', displayText: 'banktransfer' },
    { value: 'alipay', displayText: 'alipay' },
    { value: 'free', displayText: 'free' },
    { value: 'stripe_payments_express', displayText: 'stripe_payments_express' },
    { value: 'stripe_payments', displayText: 'stripe_payments' },
    { value: 'affirm_gateway', displayText: 'affirm_gateway' },
    { value: 'adyen_cc', displayText: 'adyen_cc' },
    { value: 'adyen_hpp', displayText: 'adyen_hpp' },
    { value: 'sezzlepay', displayText: 'sezzlepay' },
    { value: 'paypalucc', displayText: 'paypalucc' },
    { value: 'shopify_payments', displayText: 'shopify_payments' },
    { value: 'paypal', displayText: 'paypal' },
    { value: 'checkout_v2', displayText: 'checkout_v2' },
    { value: 'affirm', displayText: 'affirm' },
    { value: 'sezzle', displayText: 'sezzle' },
    { value: 'TEST ONLY', displayText: 'TEST ONLY' },
    { value: 'payment_review_fraud', displayText: 'payment_review|fraud' },
    { value: 'processing', displayText: 'processing|processing' },
    { value: 'closed', displayText: 'closed|closed' },
    { value: 'prefunded', displayText: 'UNFULFILLED|PARTIALLY_REFUNDED' },
    { value: 'paid', displayText: 'FULFILLED|PAID' }
  ],
  operator:[
    { value: '=', displayText: '=' },
    { value: '>', displayText: '>' },
    { value: '<', displayText: '<' },
  ],
  sortBy:[
    { value: 'order_date', displayText: 'Transaction Date' },
    { value: 'status_update_date', displayText: 'Status Update Date' },
    { value: 'shipping_date', displayText: 'Shipping Date' },
    { value: 'transition_id', displayText: 'Transaction ID' },
    { value: 'custom_code', displayText: 'Item Model' },
  ],
  exportExcel: [
    {
      value: 'ecship',
      displayText: 'LK-Ship'
    },
    {
      value: 'easyship',
      displayText: 'EasyShip'
    },
    {
      value: 'SF',
      displayText: '順豐標快(KC)'
    },
    {
      value: 'ecpost',
      displayText: 'Order with customer Name'
    }
  ],
  exportLabels: [
    {
      value: 'LK', //PHP value = 'LK0'
      displayText: 'LK'
    },
    {
      value: 'LKKC',
      displayText: 'LK(KC)'
    },
    {
      value: 'Goat', //PHP value = 'LK1'
      displayText: 'LK(Goat)'
    }
  ],
  awb: [
    // {
    //   value: 'Aramex',
    // },
    // {
    //   value: 'Dpex',
    // },
    // {
    //   value: 'EMS',
    // },
    {
      value: 'FedEx',
    },
    // {
    //   value: 'SF-HK',
    // },
    // {
    //   value: 'ZTO',
    // },
  ],
  ecship: {
    headings: [[
      'Delivery Information',
      'Delivery Service',
      'Customs Declaration',
      'Additional Information for Customs Declaration',
    ]],
    titles: [[
      'Order Reference Number',
      'Sender\'s Name',
      'Sender\'s Address',
      'Sender\'s Telephone Number',
      'Sender\'s Fax Number',
      'Recipient\'s Name',
      'Recipient\'s Address',
      'Recipient\'s City',
      'Recipient\'s Country/Region',
      'Recipient\'s Zip Code',
      'Recipient\'s Telephone Number',
      'Recipient\'s Fax Number',
      'Recipient\'s Email Address',
      'Total Weight (kg)',
      'Delivery Service',
      'Mail Type (For Air Registered Mail only)',
      'Zone',
      'Insurance Type (For Speedpost only)',
      'Insured Amount (For Air Parcel and Speedpost only)',
      'Satchel Type (For Speedpost only)',
      'Item Category',
      'Product\'s Content Details',
      'Quantity',
      'Product\'s Weight(kg)',
      'Product\'s Currency',
      'Product\'s Value',
      'HKHS Code (If applicable)',
      'Country of Origin (If applicable)',
      'Sender\'s Customs Reference',
      'Importer\'s Reference',
      'Importer\'s Telephone Number (If known)',
      'Importer\'s Fax Number  (If known)',
      'Importer\'s Email Address  (If known)',
      'Comments (e.g.: goods subject to quarantine, sanitary / phytosanitary inspection or other restrictions)',
      'Licence Number (If any)',
      'Certificate Number  (If any)',
      'Certificate Quantity',
      'Invoice Number  (If any)',
      'Invoice Quantity',
      'Sender\'s instructions in case of non-delivery (For Air Parcel only)',
    ]],
    values: [
      {
        hardcodeValue: false,
        value: 'ref_id',
        cellValue: 'A'
      },
      {
        hardcodeValue: true,
        value: 'Mak Chun Yin',
        cellValue: 'B'
      },
      {
        hardcodeValue: true,
        value: 'Flat D, 13/F, Southeast Industrial Building, 611-619 Castle Peak Road, Tsuen Wan, NT, Hong Kong',
        cellValue: 'C'
      },
      {
        hardcodeValue: true,
        value: '94919619',
        cellValue: 'D'
      },
      {
        hardcodeValue: true,
        value: '28111120',
        cellValue: 'E'
      },
      {
        hardcodeValue: false,
        value: 'contactperson',
        cellValue: 'F'
      },
      {
        hardcodeValue: false,
        value: 'fulladdress',
        cellValue: 'G'
      },
      {
        hardcodeValue: false,
        value: 'state',
        cellValue: 'H'
      },
      {
        hardcodeValue: false,
        value: 'country',
        cellValue: 'I'
      },
      {
        hardcodeValue: false,
        value: 'zip',
        cellValue: 'J'
      },
      {
        hardcodeValue: false,
        value: 'contactnumber',
        cellValue: 'K'
      },
      {
        hardcodeValue: false,
        value: 'fax',
        cellValue: 'L'
      },
      {
        hardcodeValue: false,
        value: 'contact_email',
        cellValue: 'M'
      },
      {
        hardcodeValue: false,
        value: 'weight',
        cellValue: 'N'
      },
      {
        hardcodeValue: false,
        value: 'service',
        cellValue: 'O'
      },
      {
        hardcodeValue: true,
        value: '',
        cellValue: 'P'
      },
      {
        hardcodeValue: false,
        value: 'country2',
        cellValue: 'Q'
      },
      {
        hardcodeValue: true,
        value: '',
        cellValue: 'R'
      },
      {
        hardcodeValue: false,
        value: 'insurance',
        cellValue: 'S'
      },
      {
        hardcodeValue: true,
        value: '',
        cellValue: 'T'
      },
      {
        hardcodeValue: true,
        value: 'Gift',
        cellValue: 'U'
      },
      {
        hardcodeValue: false,
        value: 'itemscodeitems',
        cellValue: 'V'
      },
      {
        hardcodeValue: true,
        value: '1',
        cellValue: 'W'
      },
      {
        hardcodeValue: false,
        value: 'weight',
        cellValue: 'X'
      },
      {
        hardcodeValue: true,
        value: 'HKD',
        cellValue: 'Y'
      },
      {
        hardcodeValue: false,
        value: 'itemvalue',
        cellValue: 'Z'
      },
      {
        hardcodeValue: true,
        value: '',
        cellValue: 'AA'
      },
      {
        hardcodeValue: true,
        value: '',
        cellValue: 'AB'
      },
      {
        hardcodeValue: true,
        value: '',
        cellValue: 'AC'
      },
      {
        hardcodeValue: true,
        value: '',
        cellValue: 'AD'
      },
      {
        hardcodeValue: true,
        value: '',
        cellValue: 'AE'
      },
      {
        hardcodeValue: true,
        value: '',
        cellValue: 'AF'
      },
      {
        hardcodeValue: true,
        value: '',
        cellValue: 'AG'
      },
      {
        hardcodeValue: false,
        value: 'items',
        cellValue: 'AH'
      },
      {
        hardcodeValue: true,
        value: '',
        cellValue: 'AI'
      },
      {
        hardcodeValue: true,
        value: '',
        cellValue: 'AJ'
      },
      {
        hardcodeValue: true,
        value: '',
        cellValue: 'AK'
      },
      {
        hardcodeValue: true,
        value: '',
        cellValue: 'AL'
      },
      {
        hardcodeValue: true,
        value: '',
        cellValue: 'AM'
      },
      {
        hardcodeValue: false,
        value: 'itemscode',
        cellValue: 'AN'
      },
      {
        hardcodeValue: false,
        value: 'address1',
        cellValue: 'AO'
      },
      {
        hardcodeValue: false,
        value: 'address2_kc',
        cellValue: 'AP'
      },
      {
        hardcodeValue: false,
        value: 'city',
        cellValue: 'AQ'
      },
      {
        hardcodeValue: false,
        value: 'state',
        cellValue: 'AR'
      },
      {
        hardcodeValue: false,
        value: 'country',
        cellValue: 'AS'
      },
      {
        hardcodeValue: false,
        value: 'zip',
        cellValue: 'AT'
      },
      {
        hardcodeValue: true,
        value: '1',
        cellValue: 'AU'
      },
      {
        hardcodeValue: false,
        value: 'status',
        cellValue: 'AV'
      }
    ]
  },
  ecpost: {
    values: [
      {
        key: 'Transition ID',
        value: 'transition_id',
      },
      {
        key: 'Ref Number',
        value: 'ref_number',
      },
      {
        key: 'Order ID',
        value: 'order_id',
      },
      {
        key: 'Country',
        value: 'country',
      },
      {
        key: 'State',
        value: 'state',
      },
      {
        key: 'City',
        value: 'city',
      },
      {
        key: 'Zip',
        value: 'zip',
      },
      {
        key: 'Name',
        value: 'contactperson',
      },
      {
        key: 'Contact Number',
        value: 'contactnumber',
      },
      {
        key: 'Contact Email',
        value: 'contact_email',
      },
      {
        key: 'Currency',
        value: 'cur',
      },
      {
        key: 'Amount',
        value: 'amount',
      },
      {
        key: 'Shipping Fee',
        value: 'delivery_charge',
      },
      {
        key: 'Status',
        value: 'status',
      },
      {
        key: 'Order Date',
        value: 'order_date',
      },
      {
        key: 'Ship Date',
        value: 'shippeddate',
      },
      {
        key: 'QTY',
        value: 'totalqty',
      },
      {
        key: 'Items',
        value: 'itemid',
      },
      {
        key: 'Custom Code',
        value: 'custom_code',
      },
      {
        key: 'Shipment',
        value: 'shipment',
      },
      {
        key: 'Shipment2',
        value: 'shipment2',
      },
      {
        key: 'Tracking',
        value: 'track_num',
      },
      {
        key: 'ErpSo',
        value: 'erpid',
      },
      {
        key: 'PaymentID',
        value: 'paypal_id',
      }
    ]
  },
  easyship: {
    values: [
      {
        key: 'Choose Courier by',
        value: '',
        hardcodeValue: true
      },
      {
        key: 'Shipping Insurance',
        value: 'No',
        hardcodeValue: true
      },
      {
        key: 'Taxes & Duties Paid by*',
        value: 'Receiver',
        hardcodeValue: true
      },
      {
        key: 'Platform',
        value: 'Kicks-Crew',
        hardcodeValue: true
      },
      {
        key: 'Platform Order Number',
        value: 'ref_id',
        hardcodeValue: false
      },
      {
        key: 'Company Order Number',
        value: 'ref_id2',
        hardcodeValue: false
      },
      {
        key: 'Receiver\'s Full Name*',
        value: 'contactperson',
        hardcodeValue: false
      },
      {
        key: 'Receiver\'s Phone Number*',
        value: 'contactnumber',
        hardcodeValue: false
      },
      {
        key: 'Receiver\'s Email*',
        value: 'paypal_email',
        hardcodeValue: false
      },
      {
        key: 'Receiver\'s Address Line 1*',
        value: 'address1',
        hardcodeValue: false
      },
      {
        key: 'Receiver\'s Address Line 2',
        value: 'address2_kc',
        hardcodeValue: false
      },
      {
        key: 'Receiver\'s Postal Code*',
        value: 'zip',
        hardcodeValue: false
      },
      {
        key: 'Receiver\'s City*',
        value: 'city',
        hardcodeValue: false
      },
      {
        key: 'Receiver\'s State/Province',
        value: 'state',
        hardcodeValue: false
      },
      {
        key: 'Receiver\'s Country*',
        value: 'country',
        hardcodeValue: false
      },
      {
        key: 'Item Category*',
        value: 'Sport & Leisure',
        hardcodeValue: true
      },
      {
        key: 'Item Description*',
        value: 'itemscode',
        hardcodeValue: false
      },
      {
        key: 'Item Platform SKU',
        value: 'itemsku',
        hardcodeValue: false
      },
      {
        key: 'Item Company SKU',
        value: 'itemsku2',
        hardcodeValue: false
      },
      {
        key: 'Item Length (cm)*',
        value: '33',
        hardcodeValue: true
      },
      {
        key: 'Item Width (cm)*',
        value: '24',
        hardcodeValue: true
      },
      {
        key: 'Item Height (cm)*',
        value: '14',
        hardcodeValue: true
      },
      {
        key: 'Item Weight (kg)*',
        value: '1',
        hardcodeValue: true
      },
      {
        key: 'Item Customs Value*',
        value: 'customvalue',
        hardcodeValue: false
      },
      {
        key: 'Item Customs Value Currency*',
        value: 'USD',
        hardcodeValue: true
      },
      {
        key: 'Item Quantity',
        value: 'itemqty',
        hardcodeValue: false
      },
      {
        key: 'Total Quantity',
        value: 'totalqty',
        hardcodeValue: false
      },
      {
        key: 'Order Status',
        value: 'status',
        hardcodeValue: false
      },
      {
        key: 'Track Number',
        value: 'track_num',
        hardcodeValue: false
      }
    ]
  },
  SFship: {
    values: [
      {
        key: '用戶訂單號',
        value: 'ref_id',
        hardcodeValue: false
      },
      {
        key: '寄件國家/地區',
        value: '香港',
        hardcodeValue: true
      },
      {
        key: '寄件郵遞區號',
        value: '',
        hardcodeValue: true
      },
      {
        key: '寄件公司',
        value: 'Kicks-crew Hong Kong Company Limited',
        hardcodeValue: true
      },
      {
        key: '寄件人',
        value: 'Johnny Mak',
        hardcodeValue: true
      },
      {
        key: '寄件電話',
        value: '28111120',
        hardcodeValue: true
      },
      {
        key: '寄件詳細地址',
        value: 'Flat D, 13/F, Southeast Industrial Building, 611-619 Castle Peak Road, Tsuen Wan, NT, Hong Kong',
        hardcodeValue: true
      },
      {
        key: '寄件證件類型',
        value: '',
        hardcodeValue: true
      },
      {
        key: '寄方證件號',
        value: '',
        hardcodeValue: true
      },
      {
        key: '收件國家/地區',
        value: 'country',
        hardcodeValue: false
      },
      {
        key: '收件郵遞區號',
        value: 'zip',
        hardcodeValue: false
      },
      {
        key: '收件公司',
        value: '',
        hardcodeValue: true
      },
      {
        key: '收件人',
        value: 'contactperson',
        hardcodeValue: false
      },
      {
        key: '收件電話',
        value: 'contactnumber',
        hardcodeValue: false
      },
      {
        key: '收件手機',
        value: '',
        hardcodeValue: true
      },
      {
        key: '收件詳細地址',
        value: 'address',
        hardcodeValue: false
      },
      {
        key: '收件證件類型',
        value: '',
        hardcodeValue: true
      },
      {
        key: '收方證件號',
        value: '',
        hardcodeValue: true
      },
      {
        key: '是否正式報關',
        value: '',
        hardcodeValue: true
      },
      {
        key: '報關服務',
        value: '',
        hardcodeValue: true
      },
      {
        key: '報關批次',
        value: '',
        hardcodeValue: true
      },
      {
        key: '稅金付款方式',
        value: '',
        hardcodeValue: true
      },
      {
        key: '稅金帳號',
        value: '',
        hardcodeValue: true
      },
      {
        key: '商品編號',
        value: 'eCode',
        hardcodeValue: false
      },
      {
        key: '商品名稱',
        value: 'eTitle',
        hardcodeValue: false
      },
      {
        key: '商品單價',
        value: 'price',
        hardcodeValue: false
      },
      {
        key: '幣別',
        value: '港幣',
        hardcodeValue: true
      },
      {
        key: '商品數量',
        value: 'eQty',
        hardcodeValue: false
      },
      {
        key: '單位',
        value: '盒',
        hardcodeValue: true
      },
      {
        key: '包裹重量',
        value: '',
        hardcodeValue: true
      },
      {
        key: '寄方備註',
        value: '如有附加費產生,必需先上報寄服處理,不能派件',
        hardcodeValue: true
      },
      {
        key: '運費付款方式',
        value: '寄付月結',
        hardcodeValue: true
      },
      {
        key: '業務類型',
        value: '順豐標快',
        hardcodeValue: true
      },
      {
        key: '件數',
        value: '',
        hardcodeValue: true
      },
      {
        key: '代收金額',
        value: '',
        hardcodeValue: true
      },
      {
        key: '保價金額',
        value: '',
        hardcodeValue: true
      },
      {
        key: '包裝服務',
        value: '',
        hardcodeValue: true
      },
      {
        key: '其他費用',
        value: '',
        hardcodeValue: true
      },
      {
        key: '簽回單',
        value: '',
        hardcodeValue: true
      },
      {
        key: '長（cm）',
        value: '',
        hardcodeValue: true
      },
      {
        key: '寬（cm）',
        value: '',
        hardcodeValue: true
      },
      {
        key: '高（cm）',
        value: '',
        hardcodeValue: true
      },
      {
        key: '體積（cm³）',
        value: '',
        hardcodeValue: true
      },
      {
        key: '擴展字段1',
        value: '',
        hardcodeValue: true
      },
      {
        key: '擴展字段2',
        value: '',
        hardcodeValue: true
      },
      {
        key: '擴展字段3',
        value: '',
        hardcodeValue: true
      },
      {
        key: '擴展字段4',
        value: '',
        hardcodeValue: true
      },
      {
        key: '擴展字段5',
        value: '',
        hardcodeValue: true
      },
      {
        key: '港澳臺件標記勿刪',
        value: '',
        hardcodeValue: true
      },
    ]
  }
}



export default {
  orderFilterData
};
