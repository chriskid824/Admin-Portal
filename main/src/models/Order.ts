// TODO: Support all orders. currently this only support orders from DU.

import { BaseModel } from "./BaseModel";

export class Order extends BaseModel {
  protected static idColumn: string = 'transition_id';

  get refNumber(): string {
    return this.data['ref_number'];
  }

  get customerName(): string {
    return this.data['contactperson'] ?? '';
  }

  get customerEmail(): string {
    return this.data['contact_email'] ?? '';
  }

  get amount(): number {
    return this.data['amount'] ?? 0;
  }

  get currency(): string {
    return 'USD';
  }

  get status(): string {
    return this.data['status'] ?? '';
  }
}
