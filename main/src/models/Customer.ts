import { BaseModel } from "./BaseModel";

export class Customer extends BaseModel {
  protected static idColumn: string = 'member_id';

  get name(): string {
    return this.data['contactperson'] ?? '';
  }

  get email(): string {
    return this.data['contact_email'] ?? '';
  }

  get contactNumber(): string {
    return this.data['contactnumber'] ?? '';
  }

  get address(): string[] {
    const keys = [
      'address1',
      'address2',
      'address3',
      'city',
      'state',
      'zip',
      'country'
    ];
    return keys.map((k) => this.data[k] ?? '');
  }
}
