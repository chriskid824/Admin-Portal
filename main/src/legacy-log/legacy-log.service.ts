import { Injectable } from "@nestjs/common";
import { RawData } from "src/models/BaseModel";
import { BaseService } from "src/models/BaseService";
import { LegacyLog, LegacyLogUpdateType } from "src/models/LegacyLog";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";

@Injectable()
export class LegacyLogService extends BaseService {
  protected tableName: string = 'sys_log_p_update';
  protected tableAlias: string = 'log';

  async findByProductId(pid: number): Promise<LegacyLog> {
    const row: RawData = await this.select()
      .where('pid = :pid', { pid })
      .andWhere('deleted = 0')
      .getRawOne();
    return row ? LegacyLog.rawToObject(row) : null;
  }

  private objToValues(log: LegacyLog): QueryDeepPartialEntity<unknown> {
    return {
      'pid': log.pid,
      'update_type': log.updateType,
      'timestamp': log.timestamp,
      'deleted': 0
    } as QueryDeepPartialEntity<unknown>;
  }

  async create(log: LegacyLog): Promise<number> {
    const insertResult = await this.insert()
      .values(this.objToValues(log))
      .execute();
    return insertResult.raw.insertId;
  }

  async updateLog(log: LegacyLog): Promise<any> {
    return this
      .update()
      .set(this.objToValues(log))
      .where('id = :id', { id: log.id });
  }

  // based on `write_log_p_update` in hk.kickscrewseller.com/system/function.php
  async writeLogByProductId(logData: RawData): Promise<boolean> {
    const pid: number = logData['pid'] ?? -1;
    if (pid === -1) return false;
    // assume timestamp is passed in milliseconds, 
    // convert to seconds to align with legacy
    logData['timestamp'] = Math.floor(logData['timestamp'] / 1000);
    // each pid only keep one record
    const oldLog: LegacyLog = await this.findByProductId(pid);
    let newLog: LegacyLog = LegacyLog.rawToObject(logData);
    if (oldLog) {
      if (oldLog.updateType === LegacyLogUpdateType.All
        || newLog.updateType === oldLog.updateType
      ) {
        // skip update
        return true;
      }

      newLog.id = oldLog.id;
      newLog.updateType =
        (newLog.updateType === LegacyLogUpdateType.All
          || newLog.updateType === LegacyLogUpdateType.Image
          || oldLog.updateType === LegacyLogUpdateType.Image)
          ? LegacyLogUpdateType.All
          : LegacyLogUpdateType.PriceQtyAttr;
      return !!(this.updateLog(newLog));
    }
    else {
      return !!(this.create(newLog));
    }
  }
}
