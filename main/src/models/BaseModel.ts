export type RawData = {
  id?: number;
};

export class BaseModel {
  protected static idColumn: string = 'id';

  constructor(public id: number, public data: RawData) {}

  static rawToObject<T extends typeof BaseModel>(this: T, data: RawData): InstanceType<T> {
    return new this(data[this.idColumn], data) as InstanceType<T>;
  }
}
