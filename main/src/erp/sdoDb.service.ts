import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { BaseService } from 'src/models/BaseService';
import { Connection } from 'typeorm';

@Injectable()
export class SdoDbService extends BaseService {
  constructor(
    @InjectConnection('backend') protected readonly connection: Connection,
  ) {
    super(connection);
  }

  private defaultTable = 'sys_sdo_web';
  protected tableName = this.defaultTable;
  protected tableAlias = 'sdo';

  async findBySdo(
    sdo: string,
    tableName: string = this.defaultTable,
  ): Promise<any> {
    this.tableName = tableName;
    return this.select(['sdo'])
      .where('sdo = :sdo', { sdo })
      .getRawOne();
  }

  async create(
    sdoArr: any | any[],
    tableName: string = this.defaultTable,
  ): Promise<any> {
    this.tableName = tableName;
    if (!Array.isArray(sdoArr)) {
      sdoArr = [sdoArr];
    }
    if (sdoArr.length === 0) {
      return;
    }
    sdoArr = sdoArr.map(
      (obj) => Object.assign({
        addressdate: 0,
        shippeddate: 0,
        tracking: '',
        // `updated` column:
        // 應該係以前出大陸單時防止get sdo from erp rewrite tracking. 宜家已經無用
        // 1 ： do not rewrite.
        updated: 1,
        luckydraw: 0,
        lost: 0,
        returned: 0,
        not_zto: 0,
      }, obj)
    );
    const columns = Object.keys(sdoArr[0]);
    return this.insert(columns).values(sdoArr).execute();
  }

  async updateSdo(
    sdo: string,
    sdoObj: any,
    tableName: string = this.defaultTable,
  ): Promise<any> {
    this.tableName = tableName;
    return this.update()
      .set(sdoObj)
      .where('sdo = :sdo', { sdo })
      .execute();
  }
}
