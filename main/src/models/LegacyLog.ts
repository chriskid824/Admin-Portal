import { BaseModel, RawData } from "./BaseModel";

export enum LegacyLogUpdateType {
  All = 'All',
  Image = 'Image',
  PriceQtyAttr = 'PriceQtyAttr',
  Price = 'Price',
  QTY = 'QTY',
  Attr = 'Attr'
};

export class LegacyLog extends BaseModel {
  public pid: number;
  public updateType: LegacyLogUpdateType;
  public timestamp: number; // in seconds
  public deleted: number;
  
  constructor(
    public id: number,
    public data: RawData
  ) {
    super(id, data);
    this.pid = data['pid'];
    this.updateType = LegacyLogUpdateType[data['update_type']];
    this.timestamp = data['timestamp'] ?? Math.floor(new Date().getTime() / 1000);
    this.deleted = data['deleted'];
  }
}
