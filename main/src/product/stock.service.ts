import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/models/BaseService';
import { CategoryType } from './category.service';

@Injectable()
export class StockService extends BaseService {
  protected tableName = 'sys_stock';
  protected tableAlias = 'stock';
  protected categoryTable = 'sys_category';
  protected categoryAlias = 'category';
  protected productCategoryTable = 'sys_r_category_product';
  protected productCategoryAlias = 'productCategory';
  protected productTable = 'sys_product';
  protected productAlias = 'product';

  // TBD => Pass to productDetails
  public async getBarcodes(product_id: string): Promise<any> {
    const barcode = this.getQueryBuilder()
      .select('barcode')
      .from(this.tableName, this.tableAlias)
      .where('product_id = :product_id', { product_id })
      .getRawMany();

    return barcode;
  }

  // Create Product
  // orUpdate is to avoid the case like adidas k0:k1 since k0 and k1 both have 3.5 size.
  public async insertStock(values) {
    const columns = [
      'product_id',
      'size_id',
      'sku',
      'erpsku',
      'qty',
      'price',
      'price_hkd',
      'price_jpy',
      'cn_price',
      'createdate',
      'modifydate',
      'consign',
      'deleted',
    ];

    const result = {};
    columns.forEach((column, i) => (result[column] = values[i]));

    const insertStock = this.insert(columns)
      .values(result)
      .orUpdate({ conflict_target: ['sku'], overwrite: columns })
      .execute();

    return insertStock;
  }

  // SoftDelete Product
  public async softDeleteStock(product_id) {
    const deleteStock = this.update()
      .set({ deleted: () => '1' })
      .where('product_id = :product_id', { product_id })
      .execute();

    return deleteStock;
  }

  // Delete Product Forever
  public async deleteStock(product_id) {
    const deleteStock = this.getQueryBuilder()
      .delete()
      .from(this.tableName)
      .where('product_id = :product_id', { product_id })
      .execute();

    return deleteStock;
  }

  //Update product (table: sys_stock)
  public async updateStock(product_id) {
    const now = Math.floor(Date.now() / 1000);
    const updateStock = this.update()
      .set({
        tb_listed: () => '0',
        modifydate: () => now.toString(),
      })
      .where('product_id = :product_id', { product_id: product_id })
      .execute();
    return updateStock;
  }

  public async getCategoriesBySku(
    sku: string,
    parent: number,
    selectColumn?: string[],
    limit?: number,
  ): Promise<any> {
    let selectQuery = selectColumn ? this.select(selectColumn) : this.select();
    
    selectQuery = selectQuery
      .leftJoin(
        this.productCategoryTable,
        this.productCategoryAlias,
        `${this.productCategoryAlias}.product_id = ${this.tableAlias}.product_id`,
      )
      .leftJoin(
        this.categoryTable,
        this.categoryAlias,
        `${this.categoryAlias}.id = ${this.productCategoryAlias}.category_id`,
      )
      .where(`${this.tableAlias}.sku = :sku`, { sku })
      .andWhere(`${this.tableAlias}.deleted = 0`)
      .andWhere(`${this.categoryAlias}.deleted = 0`)
      .andWhere(`${this.categoryAlias}.parent = :parent`, { parent });
    
    if (limit) {
      selectQuery = selectQuery.limit(limit);
    }

    return selectQuery.getRawMany();
  }

  public async getLocationCodesBySku(
    sku: string,
    limit: number = 2,
    alias: string = 'name',
  ) {
    const parent = CategoryType.LOCATION;
    const columns = [`${this.categoryAlias}.name ${alias}`];
    return this.getCategoriesBySku(sku, parent, columns, limit);
  }

  public async getProductNameBySku(sku: string): Promise<string> {
    const columns = [`${this.productAlias}.name`];
    const result = this.select(columns)
      .leftJoin(
        this.productTable,
        this.productAlias,
        `${this.productAlias}.id = ${this.tableAlias}.product_id`,
      )
      .where(`${this.tableAlias}.sku = :sku`, { sku })
      .getRawOne();
    return result ? result['name'] : null;
  }

  // Get Stock SizeID
  public async getSizeIDBySku(sku) {
    const stock = this.select(['size_id'])
      .where('sku = :sku', { sku })
      .getRawOne();
    return stock;
  }

  public async getSkuByProductAndSize(productId: number, sizeId: number) {
    const stock = this.select(['sku'])
      .where('product_id = :productId', { productId })
      .andWhere('size_id = :sizeId', { sizeId })
      .getRawOne();
    return stock;
  }
}
