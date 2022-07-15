import { Injectable } from "@nestjs/common";
import { InjectConnection } from "@nestjs/typeorm";
import { BaseService } from "src/models/BaseService";
import { Connection } from "typeorm";

@Injectable()
export class LocationService extends BaseService {
  constructor(
    @InjectConnection('backend') protected readonly connection: Connection,
  ) {
    super(connection);
  }
  protected tableName = 'sys_transition';
  protected tableAlias = 'transition';

  public async getStateCode(state: string): Promise<string> {
    if (state.trim().length < 3) {
      return state;
    }
    const table = 'province_codes';
    const alias = 'p';
    const columns = ['state', 'code'];
    const result = await this.getQueryBuilder()
      .select(columns)
      .from(table, alias)
      .where('state like :state', { state: `${state}%` })
      .getRawOne();
    return result?.code || result?.state || state;
  }
}