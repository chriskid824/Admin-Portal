import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectRepository } from '@nestjs/typeorm';
import { BaseService } from 'src/models/BaseService';
import {
  Repository,
  Connection,
  LimitOnUpdateNotSupportedError,
} from 'typeorm';
import { ProductExtended } from './productExtended.entity';
import { GoogleAuth } from 'google-auth-library';
import config from 'src/config';
import { DuProduct } from 'src/entities/legacy/DuProduct.entity';
import { ShopifyProductUploaded } from 'src/entities/legacy/ShopifyProductUploaded.entity';
import { PubSubService } from 'src/pubsub/pubsub.service';
import { ShopifyProductService } from './shopify.product.service';
import sizeMapping from './product.sizeMapping';
import { CategoryService } from './category.service';
import { StockService } from './stock.service';

@Injectable()
export class ProductService extends BaseService {
  constructor(
    @InjectRepository(ProductExtended)
    private repository: Repository<ProductExtended>,
    @InjectConnection('backend') protected connection: Connection,
    private readonly shopifyProductService: ShopifyProductService,
    private readonly pubSubService: PubSubService,
    private readonly categoryService: CategoryService,
    private readonly stockService: StockService,
  ) {
    super(connection);
  }
  protected tableName = 'sys_product';
  protected tableAlias = 'product';
  tableStock = 'sys_stock';
  stockAlias = 'stock';
  tableSize = 'sys_size';
  sizeAlias = 'size';

  public async getProducts(page: number, limit: number): Promise<any[]> {
    const warehouse_total =
      'SUM(a_warehouse + b_warehouse+c_warehouse+d_warehouse+e_warehouse+f_warehouse+g_warehouse+h_warehouse+i_warehouse+o_warehouse+s_warehouse+t_warehouse)';

    const columns = [
      'product.id',
      'product.model_no',
      'name',
      'series',
      'sortdate',
      'releasedate',
      'image.day7',
      'image.day15',
      'image.day30',
      'image.day360',
    ];

    const products = this.fetchRawPaginated(
      this.select(columns)
        .addSelect(warehouse_total, 'warehouse_total')
        .addSelect('SUM(qty)', 'qty')
        .leftJoin(
          this.tableStock,
          this.stockAlias,
          'product.id = stock.product_id',
        )
        .leftJoin(
          'sys_product_image',
          'image',
          'product.model_no = image.model_no',
        )
        .groupBy('product.model_no'),
      page,
      limit,
    );

    return products;
  }

  // Product Filter
  public async getFilterProducts(data, sortBy, page, limit): Promise<any[]> {
    const warehouse_total =
      'SUM(a_warehouse + b_warehouse+c_warehouse+d_warehouse+e_warehouse+f_warehouse+g_warehouse+h_warehouse+i_warehouse+o_warehouse+s_warehouse+t_warehouse)';

    const columns = [
      'product.id',
      'product.model_no',
      'product.name',
      'product.series',
      'product.sortdate',
      'product.releasedate',
      'image.day7',
      'image.day15',
      'image.day30',
      'image.day360',
    ];

    let temp = this.select(columns)
      .addSelect(warehouse_total, 'warehouse_total')
      .addSelect('SUM(qty)', 'qty')
      .leftJoin(
        this.tableStock,
        this.stockAlias,
        'product.id = stock.product_id',
      )
      .leftJoin(
        'sys_product_image',
        'image',
        'product.model_no = image.model_no',
      );

    // Filter
    const noCategories = [];
    enum categoriesValue {
      noLocation = 264,
      noType = 3,
      noAttribute = 14,
      noShop = 177,
    }

    for (const [key, value] of Object.entries(data)) {
      if (value) {
        if (value.toString().substring(0, 2) != 'no') {
          switch (key) {
            case 'brand':
            case 'gender':
            case 'location':
            case 'category':
              temp = temp.andWhere(
                `${this.tableAlias}.id in (SELECT scp.product_id FROM sys_r_category_product scp WHERE scp.category_id = :${key})`,
                { [key]: value },
              );
              break;
            case 'warehouse':
              if (value[0] == 'any') {
                temp = temp.andHaving(
                  `warehouse_total ${value[1]} ${value[2]}`,
                );
              } else {
                temp = temp.andHaving(
                  `SUM(${value[0]}) ${value[1]} ${value[2]}`,
                );
              }
              break;
            case 'size':
              temp = temp.andWhere(
                `${this.tableAlias}.id in (select product_id from sys_stock where (size_id IN (SELECT id FROM sys_size WHERE deleted=0 and tbsize = :${key} )))`,
                { [key]: value },
              );
              break;
            case 'qtyVsStock':
              temp = temp.andHaving(`${value}`);
              break;
            case 'withoutSize':
              temp = temp.andWhere(
                `${this.tableAlias}.id not in (select distinct product_id from sys_stock where deleted=0)`,
              );
              break;
            case 'createDateFrom':
              temp = temp.andWhere(
                `${this.tableAlias}.createdate between :${key} and :createDateTo`,
                { [key]: value, createDateTo: data.createDateTo },
              );
              break;
            case 'createDateTo':
              break;
            case 'model_no':
            case 'id':
              temp = temp.andWhere(`${this.tableAlias}.${key} REGEXP :${key}`, {
                [key]: value,
              });
              break;
            default:
              // Affect [`name`,`sx_name`,`series`,`barcode`]
              temp = temp.andWhere(`${this.tableAlias}.${key} like :${key}`, {
                [key]: `%${value}%`,
              });
              break;
          }
        } else {
          noCategories.push(categoriesValue[`${value}`]);
        }
      }
    }

    if (noCategories.length > 0) {
      const noCategoriesSql = noCategories.join(',');

      temp = temp.andWhere(
        `(select GROUP_CONCAT(category_id) from sys_r_category_product scp where scp.product_id=${this.tableAlias}.id and scp.category_id in (select id from sys_category where parent in (${noCategoriesSql}))) IS NULL`,
      );
    }

    if (sortBy) {
      switch (sortBy) {
        case 'day7':
        case 'day15':
        case 'day30':
        case 'day360':
          temp = temp.addOrderBy(`image.${sortBy}`, 'DESC');
          break;
        case 'warehouse_total':
          temp = temp.addOrderBy(`${sortBy}`, 'DESC');
          break;
        default:
          temp = temp.addOrderBy(`${this.tableAlias}.${sortBy}`, 'DESC');
          break;
      }
    }

    const result = this.fetchRawPaginated(
      temp
        .addOrderBy(`${this.tableAlias}.sortdate`, 'DESC')
        .groupBy('product.id'),
      page,
      limit,
    );

    return result;
  }
  // Product Filter
  public async getWarehouse() {
    const columns = [
      "GROUP_CONCAT(`code` SEPARATOR '/') as code",
      'KC_warehouse',
    ];
    const warehouse = this.getQueryBuilder()
      .select(columns)
      .from('erp_warehouse', 'erpw')
      .where(`KC_warehouse <> "" `)
      .groupBy('KC_warehouse')
      .orderBy('KC_warehouse')
      .getRawMany();
    return warehouse;
  }
  public async getByModelNo(modelNo: string): Promise<any> {
    const columns = [
      'id',
      'modelno',
      'model_no',
      'name',
      'series',
      'made_in',
      'color',
      'color_option',
      'price',
      'payment_gateway',
      'releasedate',
      'sortdate',
    ];

    const product = this.select(columns)
      .where('model_no = :modelNo', { modelNo })
      .getRawOne();
    return product;
  }

  public async getProductDetail(product_id: number): Promise<any> {
    const columns = [
      'product.id',
      'product.modelno',
      'product.model_no',
      'product.name',
      'product.series',
      'product.made_in',
      'product.color',
      'product.color_option',
      'product.price',
      'product.payment_gateway',
      'product.releasedate',
      'product.sortdate',
      'product.product_type',

      'size.name as size',
      'stock.qty',
      'stock.sku',
      'stock.price',
    ];

    const product = this.select(columns)
      .leftJoin(
        this.tableStock,
        this.stockAlias,
        'product.id = stock.product_id',
      )
      .leftJoin(this.tableSize, this.sizeAlias, 'size.id = stock.size_id')
      .where('product.id= :product_id', { product_id })
      .getRawMany();
    return new Promise(async (resolve) => {
      const _ = await product;
      resolve(
        _.reduce(
          (result, current) => {
            const { variants } = result;
            if (current.sku) {
              variants.push({
                size: current.size,
                qty: current.qty,
                sku: current.sku,
                price: current.price,
              });
            }
            delete current.size;
            delete current.qty;
            delete current.sku;
            delete current.price;
            result = { ...current, variants };
            return result;
          },
          { variants: [] },
        ),
      );
    });
  }

  public async getProductsDetail(): Promise<any> {
    const columns = [
      'product.id',
      'product.modelno',
      'product.model_no',
      'product.name',
      'product.series',
      'product.made_in',
      'product.color',
      'product.color_option',
      'product.price',
      'product.payment_gateway',
      'product.releasedate',
      'product.sortdate',
      'product.product_type',

      'size.name as size',
      'stock.qty',
      'stock.sku',
      'stock.price',
    ];

    const products = this.select(columns)
      .leftJoin(
        this.tableStock,
        this.stockAlias,
        'product.id = stock.product_id',
      )
      .leftJoin(this.tableSize, this.sizeAlias, 'size.id = stock.size_id')
      .where('TIMESTAMPDIFF(SECOND, product.udt, NOW())<=3600')
      .getRawMany();
    return new Promise(async (resolve) => {
      const _ = await products;
      resolve(
        _.reduce((result, current) => {
          result[current.model_no] = result[current.model_no] || {
            ...current,
            variants: [],
          };
          if (current.sku) {
            result[current.model_no].variants.push({
              size: current.size,
              qty: current.qty,
              sku: current.sku,
              price: current.price,
            });
            delete result[current.model_no].size;
            delete result[current.model_no].qty;
            delete result[current.model_no].sku;
            delete result[current.model_no].price;
          }
          return result;
        }, {}),
      );
    });
  }

  public async getColor_option(): Promise<any> {
    const category = this.getQueryBuilder()
      .select()
      .from('sys_color_option', 'color')
      .getRawMany();

    return category;
  }

  public async getShow_description(id) {
    const show = this.select(['show_description'])
      .where('id = :id', { id })
      .getRawOne();

    return show;
  }

  public async getProduct_type() {
    const product_types = this.getQueryBuilder()
      .select(['product_type_eng', 'total_count'])
      .from('sys_product_type', 'spt')
      .distinct(true)
      .orderBy('total_count', 'DESC')
      .where(`product_type_eng != ''`)
      .getRawMany();

    return product_types;
  }

  //Update Product (table: sys_product)
  public async updateProduct(updateData, id) {
    const updateProduct = this.update()
      .set(updateData)
      .where('id = :id', { id: id })
      .execute();

    return updateProduct;
  }

  //Update product detail (table: sys_r_category_product) insert attributes
  //Insert related category_id with product_id in sys_r_category_product
  public async insertAttributes(category_id, product_id) {
    if (!category_id && category_id !== 0) {
      return;
    }
    const columns = ['category_id', 'product_id', 'createdate'];
    const insertAttributes = this.getQueryBuilder()
      .insert()
      .into('sys_r_category_product', columns)
      .values({ category_id, product_id, createtime: Date.now() / 1000 })
      .execute();

    return insertAttributes;
  }

  // Update product (Get model_no to update shopify product)
  public async getModelNoById(id) {
    const model_no = this.select(['model_no'])
      .where('id = :id', { id })
      .getRawOne();

    return model_no;
  }

  // Update product (show_Description)
  public async updateShowDescription(id, show) {
    show = +show;

    const result = this.update()
      .set({
        show_description: show,
      })
      .where('id = :id', { id })
      .execute();
    return result;
  }

  // Create Product
  public async createProduct(productData) {
    const columns = [
      'model_no',
      'modelno',
      'name',
      'series',
      'price',
      'handler',
      'releasedate',
      'sortdate',
      'expirydate',
      'createdate',
      'modifydate',
      'deleted',
      'product_type',
      'color',
    ];

    const model_no = productData['model_no'].toUpperCase();
    let sort_date = Math.floor(Date.parse(productData.sort_date) / 1000);
    if (!sort_date) {
      sort_date = Math.floor(Date.parse('2021') / 1000);
    }
    const now = Math.floor(Date.now() / 1000);

    const createProduct = this.getQueryBuilder()
      .insert()
      .into(this.tableName, columns)
      .values({
        model_no: model_no,
        modelno: model_no,
        name: productData.product_name,
        series: productData.series,
        price: productData.retail_price,
        handler: -1,
        releasedate: sort_date,
        sortdate: sort_date,
        expirydate: sort_date + 15552000,
        createdate: now,
        modifydate: now,
        deleted: 0,
        product_type: productData.product_type ?? '',
        color: productData.color ?? '',
      })
      .execute();
    return createProduct;
  }

  // Create Product
  public async insertBackendProductHandler(userId, productId) {
    const columns = ['userId', 'productId'];
    const backendHandler = this.repository
      .createQueryBuilder()
      .insert()
      .into('productExtended', columns)
      .values({ userId, productId })
      .execute();

    return backendHandler;
  }

  // View Create Product In Backend
  public async getProductExtended() {
    const backendSelector = this.repository
      .createQueryBuilder()
      .select()
      .getRawMany();

    return backendSelector;
  }

  // Create Product
  public async insertProductCategories(product_id, categories) {
    const columns = ['category_id', 'product_id', 'createdate'];

    const tempCategories = categories.map((category) => {
      return {
        category_id: category,
        product_id,
        createdate: Math.floor(Date.now() / 1000),
      };
    });

    const insertData = this.getQueryBuilder()
      .insert()
      .into('sys_r_category_product', columns)
      .values(tempCategories)
      .execute();

    return insertData;
  }

  //Create Product
  // TODO: Add a size service??
  public async getSizeByBrandAndGender(genderCode: string, brand: number) {
    const columns = ['id', 'name', 'custom_code', 'erp_code'];

    const sizeData = this.getQueryBuilder()
      .select(columns)
      .from('sys_size', 'size')
      .where('gender = :genderCode', { genderCode })
      .andWhere('category_id = :brand', { brand })
      .andWhere("gender != '' ")
      .orderBy('sort', 'ASC')
      .getRawMany();

    return sizeData;
  }

  public async getSizeByBrand(brand: number) {
    const columns = ['DISTINCT gender'];

    const sizeData = this.getQueryBuilder()
      .select(columns)
      .from('sys_size', 'size')
      .andWhere('category_id = :brand', { brand })
      .andWhere("gender != '' ")
      .andWhere('`id` not in (83,84,85,86,87,88,89)') // Shoes size which is not in use
      .andWhere(`deleted = 0`)
      .getRawMany();
    const sizeChart = (await sizeData).map((ele) => {
      return {
        gender: ele.gender,
        displayName: sizeMapping.getSizeDisplayName(brand, ele.gender),
      };
    });
    // Special logic
    let code = '';
    switch (brand) {
      case 5: // Nike
      case 6: // Adidas
        code = 'K0:K1';
        sizeChart.push({
          gender: code,
          displayName: sizeMapping.getSizeDisplayName(brand, code),
        });
        break;
      case 38: // Converse
      case 159: // Reebok
      case 189: // Puma
        code = 'K1:K2';
        sizeChart.push({
          gender: code,
          displayName: sizeMapping.getSizeDisplayName(brand, code),
        });
        break;
    }

    return sizeChart.sort((current, next) => {
      return current.gender < next.gender ? -1 : 1;
    });
  }

  //Create Product
  // TODO: Add a size service??
  public async getFreeSize() {
    const columns = ['id', 'name', 'custom_code', 'erp_code'];

    const sizeData = this.getQueryBuilder()
      .select(columns)
      .from('sys_size', 'size')
      .where('id = :id', { id: 3506 })
      .orderBy('sort', 'ASC')
      .getRawOne();

    return sizeData;
  }

  //Create Product
  public async getCurrency(cms_id) {
    const column = 'cms_content_en as currency';

    const currency = this.getQueryBuilder()
      .select(column)
      .from('sys_cms', 'cms')
      .where('cms_id  = :cms_id', { cms_id })
      .getRawOne();

    return currency;
  }

  public async deleteProduct(product_id) {
    const deleteProduct = this.getQueryBuilder()
      .delete()
      .from(this.tableName)
      .where('id = :product_id', { product_id })
      .execute();

    return deleteProduct;
  }

  // Delete Product Categories
  public async deleteProductCategories(product_id) {
    const deleteProductCategories = this.getQueryBuilder()
      .delete()
      .from('sys_r_category_product')
      .where('product_id = :product_id', { product_id })
      .execute();

    return deleteProductCategories;
  }

  // Delete ProductHandler in Backend
  public async deleteProductHandler(productId) {
    const deleteProductHandler = this.repository
      .createQueryBuilder()
      .delete()
      .where('productId = :productId', { productId })
      .execute();

    return deleteProductHandler;
  }
  // TODO: Add a size service??
  public async getCustomCodeBySize(sizeID, categoryID) {
    const columns = ['custom_code'];

    const sizeCode = await this.getQueryBuilder()
      .select(columns)
      .from('sys_size', 'size')
      .where('deleted = 0')
      .andWhere('category_id = :categoryId', { categoryId: categoryID })
      .andWhere('id = :sizeid', { sizeid: sizeID })
      .getRawOne();

    return sizeCode.custom_code;
  }

  //For exporting order's excel
  public async getProductNames(itemid): Promise<any> {
    const columns = ['product.name', 'product.model_no', 'stock.sku'];
    const itemArr: Array<string> = itemid.split(':::');
    let itemsName = '';

    for (const item of itemArr) {
      if (item.trim() != '') {
        const tmpArr = item.split('-');

        const row1 = await this.select(columns)
          .leftJoinAndSelect(
            this.tableStock,
            this.stockAlias,
            'stock.product_id = product.id',
          )
          .where('product.id = :productid', { productid: tmpArr[0] })
          .andWhere('stock.size_id = :sizeid', { sizeid: tmpArr[1] })
          .getRawOne();

        itemsName += ';' + row1['name'] + ' ' + row1['sku'];
      }
    }

    if (itemsName.substr(0, 1) == ';') itemsName = itemsName.substr(1);

    return itemsName;
  }

  // XXX: Assume this doesn't change. If category data changes, the content in
  // cache will be invalid.
  private nameToCategoryCache = {};
  public async getCategoryByName(name: string) {
    // This can be optimized by loading all categories into memory at once.
    // But this is fine for now.

    const lowerCaseName = name.trim().toLowerCase();
    // Check if this has key, because we might have queried before but found nothing
    if (this.nameToCategoryCache.hasOwnProperty(lowerCaseName)) {
      return this.nameToCategoryCache[lowerCaseName];
    }
    const columns = ['id', 'name'];
    const category = await this.getQueryBuilder()
      .select(columns)
      .from('sys_category', 'category')
      .where('deleted = 0')
      .andWhere('LOWER(name) = :name', { name: lowerCaseName })
      .limit(1)
      .getRawOne();

    this.nameToCategoryCache[name] = category;
    return category;
  }

  // TODO: Add a size service??
  public async getSizeById(id) {
    const columns = ['id', 'name', 'custom_code', 'erp_code'];

    const sizeData = this.getQueryBuilder()
      .select(columns)
      .from('sys_size', 'size')
      .where('id = :id', { id })
      .getRawOne();

    return sizeData;
  }

  public async triggerPriceStockCalculation(pid: number): Promise<any> {
    const { model_no } = await this.getModelNoById(pid);
    const priceEngine = config.nexus.priceEngineUrl;

    const auth = new GoogleAuth();
    const client = await auth.getIdTokenClient(priceEngine);
    const url = `${priceEngine}/modelNo/${model_no}`;
    const res = await client.request({ url, method: 'POST' });
    return res.data;
  }

  public async triggerSkuCalculation(sku: string): Promise<any> {
    const priceEngine = config.nexus.priceEngineUrl;

    const auth = new GoogleAuth();
    const client = await auth.getIdTokenClient(priceEngine);
    const url = `${priceEngine}/sku/${sku}`;
    const res = await client.request({ url, method: 'POST' });
    return res.data;
  }

  // Add tags in mgt_product_att by metafields
  public async updateMetafieldsByModelNumber(metafields, modelNumber) {
    // Remove release_date and modelNumber
    const clone = {};
    Object.keys(metafields).forEach((key) => {
      if (key != 'release_date' && key != 'series' && key != 'name')
        clone[key] = metafields[key];
    });
    if (Object.keys(clone).length > 0) {
      const response = this.getQueryBuilder()
        .update('mgt_product_att')
        .set(clone)
        .where('model_no = :modelNumber', { modelNumber })
        .execute();
      return response;
    }
  }

  public async getMetafieldsByModelNumber(modelNumber) {
    const response = this.getQueryBuilder()
      .select()
      .from('mgt_product_att', 'mpa')
      .where('model_no = :modelNumber', { modelNumber })
      .getSql();
    console.info('getMetafieldsByModelNumber');
    const result = await response;
    console.info(result);
    return new Promise(async (resolve) => {
      resolve(
        Object.keys(result)
          .filter((key) => {
            if (key == 'model_no' || key == 'udt') {
              return false;
            } else {
              return result[key] ? true : false;
            }
          })
          .reduce((obj, key) => {
            obj[key] = result[key];
            return obj;
          }, {}),
      );
    });
  }

  public getKreamProducts(): Promise<any[]> {
    const columns = [
      'model_no',
      'size',
      'quantity',
      'kc_sku',
      'brand',
      "concat('https://kream.co.kr/search?keyword=', model_no) as url",
    ];
    const products = this.getQueryBuilder()
      .select(columns)
      .from('kream', 'kream')
      .where(
        `\`model_no\` not in (select \`model_no\` from \`kickscrew_db2\`.\`sys_product\` where \`deleted\`=0)`,
      )
      .distinct(true)
      .getRawMany();
    return products;
  }
  public getNiceProducts(): Promise<any[]> {
    const columns = ['model_no', 'brand'];
    const products = this.getQueryBuilder()
      .select(columns)
      .from('heiya_stock', 'heiya_stock')
      .where(
        `\`model_no\` not in (select \`model_no\` from \`kickscrew_db2\`.\`sys_product\` where \`deleted\`=0)`,
      )
      .distinct(true)
      .getRawMany();
    return products;
  }
  public getDuProducts(): Promise<any[]> {
    const columns = [
      'd.`article_number` as model_no',
      'd.`title`',
      'd.`spu_logo` as image',
      'd.`brand_name` as brand',
      'd.`category_name` as category',
    ];
    const products = this.getQueryBuilder()
      .select(columns)
      .from(DuProduct, 'd')
      .where(`\`brand_name\` <> "测试"`)
      .andWhere(`\`article_number\` REGEXP "^[0-9A-Z]+[0-9A-Z_-]+[0-9A-Z]+$"`)
      .andWhere(
        `d.\`spu_id\` in (SELECT distinct d.\`spu_id\` FROM du.\`skus\` WHERE \`spu_id\`=d.\`spu_id\` and \`qty\`>0 and \`lowest_price\`>0 and \`sku_status\`<>0)`,
      )
      .andWhere(
        `(
        d.article_number not in (SELECT distinct \`model_no\` FROM \`kickscrew_db2\`.\`sys_product\` p WHERE p.model_no=d.article_number) 
        and d.article_number not in (SELECT distinct \`model_no2\` FROM \`kickscrew_db2\`.\`sys_product\` p WHERE p.model_no2=d.article_number)
        )`,
      )
      .distinct(true)
      .getRawMany();
    return products;
  }
  public getMarathonProducts(): Promise<any[]> {
    const columns = [
      'model_no',
      'size',
      'quantity',
      'kc_sku',
      'brand',
      "concat('https://marathonsports.hkstore.com/marathon_tc_hk/catalogsearch/result/?q=', model_no) as url",
    ];
    const products = this.getQueryBuilder()
      .select(columns)
      .from('hkmarathon', 'hkmarathon')
      .where(
        `\`model_no\` not in (select \`model_no\` from \`kickscrew_db2\`.\`sys_product\` where \`deleted\`=0)`,
      )
      .distinct(true)
      .getRawMany();
    return products;
  }
  public getFootlockerHKProducts(): Promise<any[]> {
    const columns = [
      'model_no',
      'size',
      'kc_sku',
      'brand',
      "concat('https://www.footlocker.hk/en/search?q=', model_no) as url",
    ];
    const products = this.getQueryBuilder()
      .select(columns)
      .from('hkfootlocker', 'hkfootlocker')
      .where(
        `\`model_no\` not in (select \`model_no\` from \`kickscrew_db2\`.\`sys_product\` where \`deleted\`=0)`,
      )
      .distinct(true)
      .getRawMany();
    return products;
  }
  public getShopifyProductsWithoutImage(): Promise<any[]> {
    const columns = [
      'd.`sku` as model_no',
      'd.`title`',
      'd.`vendor`',
      'd.`product_type`',
      'd.`option1_values` as type',
    ];
    const products = this.getQueryBuilder()
      .select(columns)
      .from(ShopifyProductUploaded, 'd')
      .where(`\`sku\` not in (select sku from shopify.product_image_uploaded)`)
      .getRawMany();
    return products;
  }
  // Tag -> Product Creator
  // Same function in product.controller
  public async getTagArray(tagsObject) {
    tagsObject = Object.values(tagsObject).reduce(
      (tagStr: string, current: string) => tagStr + ',' + current,
    );
    tagsObject = tagsObject.split(',').filter((tag) => tag);
    console.log(tagsObject);
    return tagsObject;
  }

  public async resyncProduct(id) {
    // Try to collect data
    const bkProduct = await this.getProductDetail(id);
    //const metafields = await this.getMetafieldsByModelNumber(id);
    console.info('bkProduct');
    console.info(bkProduct);
    //console.info('metafields');
    //console.info(metafields);
    return await this.publishProduct(bkProduct);
  }

  public async resyncProducts() {
    // Try to collect data
    const Products = await this.getProductsDetail();
    let result;
    for (const key in Products) {
      result = await this.publishProduct(Products[key]);
    }
    return result;
  }

  public async publishProduct(bkProduct) {
    const resyncData = {};
    console.log('Resync:', bkProduct.model_no);
    resyncData['name'] = bkProduct.name;
    resyncData['series'] = bkProduct.series;
    resyncData['modelNumber'] = bkProduct.model_no;

    // For Variants
    const genderStr =
      (
        await this.categoryService.getSelectedCategories(bkProduct.id, 'gender')
      )?.[0]?.name ?? 'Default Title';

    resyncData['gender'] = genderStr;

    resyncData['variants'] = bkProduct.variants.map((variant) => {
      return { sku: variant.sku, size: variant.size };
    });

    // sys_product may created a product but shopify.product didn't
    const shopifyProduct = await this.shopifyProductService.DBGetByModelNo(
      bkProduct.model_no,
    );
    if (shopifyProduct) {
      resyncData['body_html'] = shopifyProduct.body_html;
      resyncData['product_type'] = shopifyProduct.product_type;
      resyncData['vendor'] = shopifyProduct.vendor;
      resyncData['status'] = shopifyProduct.status;
    }
    resyncData['body_html'] = resyncData['body_html']
      ? resyncData['body_html']
      : `<p hidden>${bkProduct.model_no}</p>`;
    console.log(resyncData['body_html']);

    const metafields = await this.getMetafieldsByModelNumber(
      bkProduct.model_no,
    );
    resyncData['metafields'] = metafields;
    console.log(resyncData);

    const topicName = config.pubsubTopic.productUpdate.topicName;
    const pubsubAction = await this.pubSubService.publishMessage(
      topicName,
      resyncData,
    );

    return resyncData;
  }

  public async softDeleteProduct(id) {
    const product = await this.getProductDetail(id);
    // comment is delete forever step
    await this.getQueryBuilder()
      .update(this.tableName)
      .set({ deleted: 1 })
      .where('id = :id', { id })
      .execute();
    await this.stockService.softDeleteStock(id);

    // Set archive in shopiy.product
    // Move this DB operations to SI
    await this.shopifyProductService.DBUpdateProductBySKU(product.model_no, {
      status: 'archived',
    });

    // Publish messge to SI and archive product in shopify.product_uploaded
    const topicName = config.pubsubTopic.productUpdate.topicName;
    const message = {
      modelNumber: product.model_no,
      status: 'archived',
    };
    await this.pubSubService.publishMessage(topicName, message);
  }

  public async deleteForever(id) {
    const product = await this.getProductDetail(id);
    const modelNumber = product.model_no;
    await this.stockService.deleteStock(id);
    await this.deleteProductCategories(id);
    await this.deleteProduct(id);
    await this.deleteProductHandler(id);

    //Publish Message to SI and Delete from Shopify
    const topicName = config.pubsubTopic.productUpdate.topicName;
    const message = {
      modelNumber: product.model_no,
      delete: true,
    };
    await this.pubSubService.publishMessage(topicName, message);
  }

  public async getModelNumberAvailability(modelNumber: string) {
    const product = this.select(['model_no'])
      .where('model_no = :modelNumber', { modelNumber })
      .getRawMany();
    return (await product).length == 0 ? true : false;
  }
}
