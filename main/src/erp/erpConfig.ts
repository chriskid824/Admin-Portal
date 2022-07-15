export default {
  sdo: {
    db: {
      // SHOP_CODE: {
      //   // tid = sys_transition id ; tbid = taobao id
      //   idField: 'tid' | 'tbid',
      //   // selling platform, but not useful now
      //   fromsite: 0,
      //   table: 'sys_sdo_web' | 'sys_sdo_tb' | 'sys_sdo_other',
      // },
      KC: {
        idField: 'tid',
        fromsite: 0,
        table: 'sys_sdo_web',
      },
      KCDP: {
        idField: 'tid',
        fromsite: 0,
        table: 'sys_sdo_web',
      },
      CO: {
        idField: 'tid',
        fromsite: -5,
        table: 'sys_sdo_web',
      },
      KF: {
        idField: 'tid',
        fromsite: 10,
        table: 'sys_sdo_web',
      },
      JP: {
        idField: 'tid',
        fromsite: -10,
        table: 'sys_sdo_web',
      },
      GOAT: {
        idField: 'tbid',
        fromsite: 15,
        table: 'sys_sdo_web',
      },
      GOATCN: {
        idField: 'tbid',
        fromsite: 15,
        table: 'sys_sdo_web',
      },
      SX: {
        idField: 'tid',
        fromsite: 10,
        table: 'sys_sdo_web',
      },
      'KC-SHOP': {
        idField: 'tid',
        fromsite: 0,
        table: 'sys_sdo_web',
      },
      KCPRICEHK: {
        idField: 'tid',
        fromsite: 0,
        table: 'sys_sdo_web',
      },
      KCAPP: {
        idField: 'tid',
        fromsite: 18,
        table: 'sys_sdo_web',
      },
      Shopify: {
        idField: 'tbid',
        fromsite: 6,
        table: 'sys_sdo_web',
      },
      gogo: {
        idField: 'tbid',
        fromsite: 70,
        table: 'sys_sdo_tb',
      },
      'KC-TMALLHK': {
        idField: 'tbid',
        fromsite: 80,
        table: 'sys_sdo_tb',
      },
      'JD-HK': {
        idField: 'tbid',
        fromsite: 76,
        table: 'sys_sdo_tb',
      },
      tmallhkflagship: {
        idField: 'tbid',
        fromsite: 77,
        table: 'sys_sdo_tb',
      },
      Tmallflagship: {
        idField: 'tbid',
        fromsite: 78,
        table: 'sys_sdo_tb',
      },
      PDDKC: {
        idField: 'tbid',
        fromsite: 75,
        table: 'sys_sdo_tb',
      },
      fchktmall: {
        idField: 'tbid',
        fromsite: 81,
        table: 'sys_sdo_tb',
      },
      DEWUHK: {
        idField: 'tbid',
        fromsite: 82,
        table: 'sys_sdo_other',
      },
      DEWUHK2: {
        idField: 'tbid',
        fromsite: 83,
        table: 'sys_sdo_other',
      },
      DEWUHK3: {
        idField: 'tbid',
        fromsite: 84,
        table: 'sys_sdo_other',
      },
    }
  },
};
