import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { BaseService } from 'src/models/BaseService';
import { Connection } from 'typeorm';

@Injectable()
export class SnkrdunkProductService extends BaseService {
  constructor(
    @InjectConnection('snkrdunkdb') protected readonly connection: Connection,
  ) {
    super(connection);
  }
  protected tableName = 'minprice';
  protected tableAlias = 'minprice';
  public getSnkrProducts(): Promise<any[]> {
    const columns = [
      '`id` as model_no',
      "concat('https://snkrdunk.com/en/sneakers/', id) as url",
      "concat('https://snkrdunk.com/products/', id) as jp_url",
      'info.brand_name',
    ];
    const products = this.getQueryBuilder()
      .select(columns)
      .from('min_price', 'minprice')
      .leftJoin('info', 'info', 'minprice.id=info.productID')
      .where(
        `price >0 and \`id\` not in (
          SELECT d.\`id\`
          FROM \`kickscrew_db2\`.\`sys_product\` p
          inner join \`snkrdunk\`.\`min_price\` d on d.\`id\`=p.model_no
          where p.\`deleted\`=0
        )`,
      )
      .distinct(true)
      .getRawMany();
    return products;
  }
}
