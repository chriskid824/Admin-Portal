import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import Shopify from '@shopify/shopify-api';
import config from 'src/config';
import { BaseService } from 'src/models/BaseService';
import { Connection } from 'typeorm';

@Injectable()
export class ShopifyProductService extends BaseService {
  constructor(
    @InjectConnection('shopify') protected readonly connection: Connection,
  ) {
    super(connection);
  }
  protected tableName = 'product';
  protected tableAlias = 'sp';
  private tableUploaded = 'product_uploaded';
  private uploadedAlias = 'product_uploaded';
  private tableVariant = 'product_variant';

  private SHOPIFY_API_SUBDOMAIN = config.shopify.subDomain;
  private SHOPIFY_API_PASSWORD = config.shopify.password;

  private client = new Shopify.Clients.Graphql(
    this.SHOPIFY_API_SUBDOMAIN,
    this.SHOPIFY_API_PASSWORD,
  );
  private restClient = new Shopify.Clients.Rest(
    this.SHOPIFY_API_SUBDOMAIN,
    this.SHOPIFY_API_PASSWORD,
  );

  //================= Shopify DB =================
  public async DBGetByModelNo(model_no) {
    const columns = [
      'product_id',
      'id',
      'sku',
      'title',
      'body_html',
      'status',
      'vendor',
      'product_type',
    ];

    const product = this.select(columns)
      .where('sku = :sku', { sku: model_no })
      .getRawOne();

    return product;
  }

  // Using when Create/Update Product's tags
  public async getTagsFromMappingByTitle(title) {
    const tags = await this.getQueryBuilder()
      .select(['tag'])
      .from('product_tag_mapping', 'ptm')
      .where(`:title like CONCAT('%',keyword,'%')`, { title })
      .andWhere(`:title like CONCAT('%',keyword2,'%')`, { title })
      .getRawMany();

    return tags.map((obj) => obj.tag).join(',');
  }

  // Tag -> Product Creator
  public async DBGetTagsByModelNo(model_no) {
    const columns = [
      'pl.tags',
      'pl.tag_promotion',
      'pl.color_option',
      'pl.tags_custom1',
      'pl.metafield_designer',
      'pta.product_att_tag',
      'pl.gtins',
    ];
    const tagsObject = this.getQueryBuilder()
      .select(columns)
      .from('product_linked', 'pl')
      .leftJoin('product_tags_att', 'pta', 'pl.sku = pta.model_no')
      .where('pl.sku = :sku', { sku: model_no })
      .getRawOne();
    console.log(tagsObject);

    return tagsObject;
  }

  // Metafields -> Resync Product
  public async DBGetMetafieldsByModelNumber(modelNumber) {
    const columns = [
      'metafield_strap_material',
      'metafield_case_material',
      'metafield_watch_caliber',
      'metafield_display_mode',
      'metafield_closure',
      'metafield_upper_material',
      'metafield_version',
      'metafield_thickness',
      'metafield_release_date',
      'metafield_style',
      'metafield_colorway',
      'metafield_heel_type',
      'metafield_toe_type',
      'metafield_upper',
      'metafield_sole_material',
      'metafield_functionality',
      'metafield_season',
      'metafield_series',
      'metafield_name',
      'metafield_designer',
      'metafield_size_report',
      'metafield_surface_crystal',
    ];

    const metafields = this.select(columns)
      .where('sku = :sku', { sku: modelNumber })
      .getRawOne();

    return metafields;
  }

  public async DBUpdateProductBySKU(sku, updateData) {
    const product = this.update()
      .set(updateData)
      .where('sku = :sku', { sku })
      .execute();

    return product;
  }

  public async DBUpdateProductUploadedBySKU(sku, updateData) {
    const product = this.getQueryBuilder()
      .update(this.tableUploaded)
      .set(updateData)
      .where('sku = :sku', { sku })
      .execute();

    return product;
  }

  public async DBgetVendor() {
    const columns = ['vendor', 'count(1) as count'];

    const vendors = await this.select(columns)
      .where("vendor != '' ")
      .groupBy('vendor')
      .orderBy('count', 'DESC')
      .getRawMany();
    return vendors.map((p) => ({ vendor: p.vendor }));
  }

  // Edit -> check product existed data
  public async DBGetUploadedByModelNo(model_no) {
    const columns = [
      'id',
      'sku',
      'title',
      'body_html',
      'status',
      'vendor',
      'product_type',
    ];

    const product = this.getQueryBuilder()
      .select(columns)
      .from(this.tableUploaded, this.uploadedAlias)
      .where('sku = :sku', { sku: model_no })
      .getRawOne();

    return product;
  }

  // Create Product
  public async DBCreateProduct(productData) {
    const columns = Object.keys(productData);
    const product = this.insert(columns).values(productData).execute();

    return product;
  }

  // Create Product Variants
  // Re-sync Product Variants
  public async DBCreateOrUpdateProductVariants(productVariantData) {
    const columns = Object.keys(productVariantData);
    const productVariant = this.getQueryBuilder()
      .insert()
      .into(this.tableVariant, columns)
      .values(productVariantData)
      .orUpdate({ conflict_target: ['sku'], overwrite: columns })
      .execute();

    return productVariant;
  }

  // Re-sync Product
  public async DBResyncProduct(productData) {
    const columns = Object.keys(productData);
    const product = this.insert(columns)
      .values(productData)
      .orUpdate({ conflict_target: ['sku'], overwrite: columns })
      .execute();

    return product;
  }

  // Delete Product
  public async deleteProduct(sku) {
    const deleteProduct = this.getQueryBuilder()
      .delete()
      .from(this.tableName)
      .where('sku = :sku', { sku })
      .execute();

    return deleteProduct;
  }

  // Delete Product
  public async deleteProductVariant(model_no) {
    const deleteProductVariant = this.getQueryBuilder()
      .delete()
      .from(this.tableVariant)
      .where('model_no = :model_no', { model_no })
      .execute();

    return deleteProductVariant;
  }

  //================= Shopify API =================
  // Not in use
  public async APIGetProductDescriptionById(id) {
    id = 'gid://shopify/Product/' + id;
    const response = await this.client.query({
      data: `{
                        product (id: "${id}") {
                              id
                              title
                              descriptionHtml
                        }
                      }`,
    });
    const body: any = response.body['data'].product;

    return body;
  }

  // Not in use
  public async APIGetProductOptionsById(id) {
    id = 'gid://shopify/Product/' + id;
    const response = await this.client.query({
      data: `{
                product(id: "${id}") {
                    options {
                        name
                        values
                      }
                }
            }`,
    });
    const body: any = response;
    console.log(JSON.stringify(body));
    return body;
  }

  // Not in use
  public async APIUpdateProduct(id, updateData) {
    id = 'gid://shopify/Product/' + id;
    const response = await this.client.query({
      data: `mutation{
                    productUpdate(input: {id:"${id}",title:"${updateData.title
        }",descriptionHtml:"${updateData.body_html
        }",status:${updateData.status.toUpperCase()},productType:"${updateData.product_type
        }"}) {
                        product {
                            id
                        }
                        userErrors {
                            field
                            message
                        }
                    }
                }`,
    });
    //const body: any = response.body["data"].productUpdate.product
    const body = response;
    console.log(JSON.stringify(body));
    /* response.body
        {
            data: { productUpdate: { product: [Object], userErrors: [] } },
            extensions: {
                cost: {
                requestedQueryCost: 10,
                actualQueryCost: 10,
                throttleStatus: [Object]
                }
            }
        }
        */
    return body;
  }

  /*public async APITest(query) {
    const response = await this.client.query({
      data: query,
    });
    return response;
  }*/

  // Not in use
  public async APIRESTGetProduct(id) {
    const data = await this.restClient.get({
      path: `products/${id}`,
    });
    return data;
  }
}
