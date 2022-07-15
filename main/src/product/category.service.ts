import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/models/BaseService';

export enum CategoryType {
  BRAND = 2,
  TYPE = 3,
  GENDER = 4,
  ATTRIBUTE = 14,
  CLASS = 36,
  SHOP = 177,
  LOCATION = 264,
  ORDER_STATUS = 601,
}

@Injectable()
export class CategoryService extends BaseService {
  protected tableName = 'sys_category';
  protected tableAlias = 'category';
  protected columns = ['id', 'name'];

  public async getChildren(parent: number): Promise<any[]> {
    const detailAttributes = this.select()
      .where('deleted = 0')
      .andWhere('parent= :parent', { parent: parent })
      .getRawMany();

    return detailAttributes;
  }

  public async getChildrenOrderByName(parent: number): Promise<any[]> {
    const detailAttributes = this.select()
      .where('deleted= 0')
      .andWhere('parent= :parent', { parent: parent })
      .orderBy('name')
      .getRawMany();

    return detailAttributes;
  }

  public async getSelectedCategories(
    product_id,
    type: string | string[],
  ): Promise<any> {
    const query = this.select(['scp.category_id', this.tableAlias + '.name'])
      .leftJoin(
        'sys_r_category_product',
        'scp',
        this.tableAlias + '.id = scp.category_id',
      )
      .where(this.tableAlias + '.deleted = 0')
      .andWhere('scp.product_id = :product_id', { product_id });
    if (typeof type === 'string') {
      query.andWhere(this.tableAlias + '.type=:type', { type });
    } else {
      query.andWhere(this.tableAlias + '.type IN (:...types)', { types: type });
    }
    return query.getRawMany();
  }

  //Product Detail -- One record
  public async getByProductId(
    id: number,
    parent: number,
    selectColumn?: string[],
    orderBy?: string,
    orderDir: 'ASC' | 'DESC' = 'ASC',
  ): Promise<any> {
    let selectQuery = selectColumn ? this.select(selectColumn) : this.select();

    selectQuery = selectQuery
      .where('deleted= 0')
      .andWhere('parent = :parent', { parent: parent })
      .andWhere(
        'id IN (SELECT category_id FROM `sys_r_category_product` WHERE product_id = :productId)',
        { productId: id },
      );

    selectQuery = orderBy
      ? selectQuery.orderBy(orderBy, orderDir)
      : selectQuery;
    // parent 264 are warehouses
    if (parent == 264) {
      return await selectQuery.getRawMany();
    } else {
      return await selectQuery.getRawOne();
    }
  }

  public async getWarehousesByProductId(
    productId,
    limit,
    selectColumn = 'category.sort',
    selectOrder = 'ASC',
  ) {
    const locationColumn = [
      'substring_index(group_concat(distinct concat(category.name) order by ' +
        selectColumn +
        ' ' +
        selectOrder +
        ' ' +
        'SEPARATOR " / "),"/",' +
        limit +
        ') loc',
    ];

    let tempLocation = '';

    const locations = await this.getByProductId(productId, 264, locationColumn);

    if (locations) {
      locations.forEach((location, index) => {
        if (index == 0) {
          tempLocation = location.loc;
        } else {
          tempLocation += ':' + location.loc;
        }
      });
    }
    return tempLocation;
  }

  public async getProductTypeByProductId(productId) {
    const column = ['category.name'];

    const result = await this.getByProductId(productId, 3, column);

    return result['name'];
  }

  public async getCategoryIdByProductId(productId) {
    const detailColumn = ['category.id category_id'];

    const temp = await this.getByProductId(productId, 2, detailColumn);

    return temp.category_id;
  }

  public async getProductDetailsWithNameByProductId(productId) {
    const detailColumn = ['category.id category_id', 'category.name'];

    return await this.getByProductId(
      productId,
      264,
      detailColumn,
      'category.createdate',
      'DESC',
    );
  }

  // Use to get gender's name currently
  public async getById(id) {
    const name = this.select().where('id = :id', { id }).getRawOne();
    return name;
  }
}
