import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { DuProduct } from '../entities/legacy/DuProduct.entity';
import { ProductService } from './product.service';
import { StockService } from './stock.service';

@Injectable()
export class DuProductService {
  constructor(
    @InjectConnection('backend') protected connection: Connection,
    private productService: ProductService,
    private stockService: StockService,
  ) {}

  public async findProductsNotExistInKcCatalog(
    limit = 100,
    options: { categoryName?: string } = {},
  ): Promise<DuProduct[]> {
    let query = this.connection
      .getRepository(DuProduct)
      .createQueryBuilder('p')
      .where(
        `article_number NOT IN (
          SELECT model_no from kickscrew_db2.sys_product
        )`,
      );
    if (options.categoryName) {
      query = query.andWhere('p.categoryName = :categoryName', {
        categoryName: options.categoryName,
      });
    }
    query = query.limit(limit);

    return query.getMany();
  }

  public async findProductByModelNumber(
    modelNumber: string,
  ): Promise<DuProduct> {
    return this.connection.getRepository(DuProduct).findOne({
      where: { modelNumber },
      relations: ['attributes', 'variants'],
    });
  }

  public async importToCatalog() {
    let createdCount = 0;
    let invalid = 0;
    let invalidSize = 0;
    const products = await this.findProductsNotExistInKcCatalog(10000, {
      categoryName: '夹克',
    });
    for (const p of products) {
      const validProduct = p.validated();
      if (!validProduct) {
        invalid++;
        continue;
      }
      const fullProduct = await this.findProductByModelNumber(p.modelNumber);
      // Check variants
      const sizes = fullProduct.validVariants();
      if (sizes && sizes.length) {
        try {
          await this.createProductInKcCatalog(validProduct, sizes, fullProduct);
          createdCount++;
          console.log('Created:', { validProduct, sizes });
          console.log('Created count:', createdCount);
        } catch (e) {
          console.log('Error:', e);
          console.log('Failed to create product:', p.modelNumber);
        }
      } else {
        invalidSize++;
        console.log('Invalid size:', p.modelNumber, invalidSize);
      }
    }
    console.log(`${createdCount} products created`);
    console.log(`${invalid} products invalid`);
    console.log(`${invalidSize} products with invalid sizes`);
  }

  async createProductInKcCatalog(
    product: any,
    sizes: string[],
    duProduct: DuProduct,
  ) {
    if (sizes.length === 0) {
      console.log('No sizes found for product', product);
      return;
    }
    // Product service create product
    const createdProduct = await this.productService.createProduct({
      model_no: product.modelNumber,
      sort_date: duProduct.releaseDate ?? '2021',
      product_name: product.title,
      retail_price: 0,
      product_type: duProduct.productType ?? '',
      color: product.color ?? '',
    });
    const productId = createdProduct.raw.insertId;
    const modelNumber = product.modelNumber.toUpperCase();

    // Handle categories
    const categoryIds = [];
    if (product.brandName) {
      const brandCategory = await this.productService.getCategoryByName(
        product.brandName,
      );

      if (brandCategory) {
        categoryIds.push(brandCategory.id);
      } else {
        categoryIds.push(472);
      }

      const productTypeCategoryId = duProduct.productTypeCategoryId;
      if (productTypeCategoryId) {
        categoryIds.push(productTypeCategoryId);
      }
    }
    await this.productService.insertProductCategories(productId, categoryIds);

    // Sizes and stock
    for (const size of sizes) {
      await this.insertStock(productId, modelNumber, size);
    }
  }

  async insertStock(
    id,
    model_no: string,
    size: string,
    selling_qty = 0,
    usprice = 0,
    hkdPrice = 0,
    jpydPrice = 0,
    cnPrice = 0,
  ) {
    const now = Math.floor(Date.now() / 1000);
    if (size === '2XL') {
      size = 'XXL';
    } else if (size === '3XL') {
      size = 'XXXL';
    }
    const sizeMap = {
      XXXS: 4088,
      XXS: 4087,
      XS: 4078,
      S: 4079,
      M: 4080,
      L: 4081,
      XL: 4082,
      XXL: 4083,
      XXXL: 4084,
      XXXXL: 4085,
      XXXXXL: 4086,
      F: 3506,
    };

    const sizeId = sizeMap[size];
    if (!sizeId) {
      throw new Error(`Invalid size: ${size}`);
    }
    const sku = model_no + '-' + size;
    const erpsku = sku;

    const data = [
      id,
      sizeId,
      sku,
      erpsku,
      selling_qty,
      usprice,
      hkdPrice,
      jpydPrice,
      cnPrice,
      now,
      now,
      0,
      0,
    ];

    await this.stockService.insertStock(data);
  }
}
