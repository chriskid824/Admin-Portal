import { Injectable } from '@nestjs/common';
import { RawData } from 'src/models/BaseModel';
import { BaseService } from 'src/models/BaseService';
import { Customer } from '../models/Customer';

@Injectable()
export class CustomerService extends BaseService {
  protected tableName: string = 'sys_transition';
  protected tableAlias: string = 'o';
  protected columns: string[] = [
    'address',
    'address1',
    'address2',
    'address3',
    'country',
    'contactnumber',
    'contactperson',
    'city',
    'state',
    'zip',
    'contact_email',
    'alternate_email',
    'client_ip',
    'country_code',
    'country_name',
    'member_id',
    'language',
    'member_id2',
    'fromsite'
  ];

  async findAll(
    page: number, numPerPage: number = 50,
    orderBy: string = 'order_date', orderDir: 'ASC' | 'DESC' = 'DESC'
  ): Promise<Customer[]> {
    const rows: RawData[] = await this.fetchRawPaginated(
      this.select()
        .addSelect('count(ref_number)', 'order_count')
        .where('member_id <> 0')
        .groupBy('member_id'),
      page, numPerPage, orderBy, orderDir
    );
    return rows.map((r) => Customer.rawToObject(r));
  }

  async findById(id: number): Promise<Customer> {
    const customer: RawData = await this.select()
      .where('member_id = :id', { id })
      .orderBy('order_date', 'DESC')
      .getRawOne();
    return Customer.rawToObject(customer);
  }

  async exists(id: number): Promise<boolean> {
    const c = await this.select(['member_id'])
      .where('member_id = :id', { id })
      .getRawOne();
    return !!(c);
  }
}
