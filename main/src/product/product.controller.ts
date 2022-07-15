// TODO: Move business logic under ProductService
import {
  Controller,
  Get,
  Param,
  Render,
  Query,
  Post,
  Body,
  Res,
  UseInterceptors,
  UploadedFile,
  Redirect,
  UploadedFiles,
  HttpStatus,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { SnkrdunkProductService } from './snkrdunk.product.service';
import { CategoryService } from './category.service';
import { ImageService } from './image.service';
import { NexusApiService } from './nexusApi.service';
import { StockService } from './stock.service';
import { User } from 'src/users/user.decorator';
import { ShopifyProductService } from './shopify.product.service';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { imageFileFilter, JSONToExcelConvertor } from 'src/utils';
import { PubSubService } from 'src/pubsub/pubsub.service';
import config from '../config';
import productFilterData from './productFilterConfig';

@Controller('product')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly snkrdunkproductService: SnkrdunkProductService,
    private readonly categoryService: CategoryService,
    private readonly imageService: ImageService,
    private readonly nexusApiService: NexusApiService,
    private readonly stockService: StockService,
    private readonly shopifyProductService: ShopifyProductService,
    private readonly pubSubService: PubSubService,
  ) {}

  // Utils
  // To Format date(Use Seconde in DB) to String ("YYYY-MM-DD")
  parseDateString(date_second) {
    const date = new Date(null);
    date.setSeconds(date_second + 60 * 60 * 8);
    let month = '' + (date.getUTCMonth() + 1);
    let day = '' + date.getUTCDate();
    const year = date.getUTCFullYear();
    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    const dateString = [year, month, day].join('-');
    return dateString;
  }

  // Get sku for Inserting Stock/Product_Variant
  getSku(model_no, size) {
    const sku = model_no + '-' + size.custom_code;
    let erpsku = size.erp_code;

    if (erpsku) {
      erpsku = size.erp_code.trim();
      erpsku = model_no + '-' + erpsku;
    } else {
      erpsku = sku;
    }
    return { sku, erpsku };
  }

  // Insert to Stock (Create Product)
  async insertStock(
    id,
    sku,
    erpsku,
    selling_qty,
    usPrice,
    hkdPrice,
    jpyPrice,
    cnPrice,
    now,
    size,
  ) {
    const data = [
      id,
      size.id,
      sku,
      erpsku,
      selling_qty,
      usPrice,
      hkdPrice,
      jpyPrice,
      cnPrice,
      now,
      now,
      0,
      0,
    ];

    return await this.stockService.insertStock(data);
  }

  // Insert to product_variant (Create Product)
  async insertProductVariants(
    parent_product_id,
    model_no,
    sku,
    position,
    genderStr,
    size,
  ) {
    const data = {
      parent_product_id: parent_product_id,
      model_no: model_no,
      sku: sku,
      position: position,
      option1: genderStr,
      option2: size.name,
    };

    return this.shopifyProductService.DBCreateOrUpdateProductVariants(data);
  }

  // getDescription (Edit, View Product Detail)
  getDescriptionBody(bodyHtml) {
    let startIndex, endIndex;
    // If no <div class='wrapper'> element,
    // it means it was edited by shopify backend or cronjob default
    if (bodyHtml.search(`<div class='wrapper'`) == -1) {
      startIndex = 0;
      endIndex = bodyHtml.length;
    } else {
      startIndex = bodyHtml.search('>') + 1;
      endIndex = bodyHtml.length - 4;
    }
    const description = bodyHtml.substring(startIndex, endIndex);
    return description;
  }

  // GetSelectedCategories
  async getSelectedCategories(product_id, selectedCategoriesName) {
    const selectedCategories = [];
    for (const selectedCategory of selectedCategoriesName) {
      selectedCategories.push(
        await this.categoryService.getSelectedCategories(
          product_id,
          selectedCategory,
        ),
      );
    }
    return selectedCategories;
  }

  // Init Filter in Report View (Get those <select> options and pass filter value)
  async initFilter(filterValue?: string) {
    const [brand, gender, warehouse, location, type, attribute, shop] =
      await Promise.all([
        this.categoryService.getChildren(2),
        this.categoryService.getChildren(4),
        this.productService.getWarehouse(),
        this.categoryService.getChildrenOrderByName(264),
        this.categoryService.getChildrenOrderByName(3),
        this.categoryService.getChildrenOrderByName(14),
        this.categoryService.getChildrenOrderByName(177),
      ]);

    // Hard code <option>
    const sortBy = {
      model_no: 'Model No',
      id: 'Product ID',
      releasedate: 'Release Date',
      first_date: 'First Instock Date',
      createdate: 'Create Date',
      instock_date: 'InStock Date',
      sortdate: 'Sort Date',
      day7: '7 Day Selling Desc',
      day15: '15 Day Selling Desc',
      day30: '30 Day Selling Desc',
      day360: '360 Day Selling Desc',
      warehouse_total: 'Real Stock Desc',
    };
    const qtyVsStock = {
      qtyGtStock: 'QTY > Stock',
      StockGtQty: 'Stock > QTY',
      QSEq5: 'QTY-Stock = 5',
      QSEq10: 'QTY-Stock = 10',
      QSGt10: 'QTY-Stock > 10',
    };
    const qtyOperator = {
      '>': '>',
      '=': '=',
      '<': '<',
    };

    // Filter options
    const filterInit = {
      brand,
      gender,
      warehouse,
      location,
      type,
      attribute,
      shop,
      sortBy,
      qtyVsStock,
      qtyOperator,
    };

    const valueObject = {};
    if (filterValue) {
      for (const [key, value] of Object.entries(filterValue)) {
        if (value) {
          valueObject[key] = value;
        }
      }
    }
    filterInit['value'] = valueObject;

    return filterInit;
  }

  // Map Report View Products
  async mapProducts(product) {
    product.releasedate = this.parseDateString(product.releasedate);
    product.sortdate = this.parseDateString(product.sortdate);
    const brand = await this.categoryService.getByProductId(product.id, 2);
    if (brand) {
      product.brand = brand.name;
    }
  }

  // Map product data to pub/sub message data
  mapUpdatedDataToMessage(data) {
    const message = {};
    Object.keys(data).forEach((key) => {
      switch (key) {
        case 'body_html':
          message['descriptionHtml'] = data[key];
          break;
        case 'status':
          message[key] = data[key].toUpperCase();
          break;
        case 'option1_values':
          break;
        case 'product_type':
          message['productType'] = data[key];
          break;
        default:
          // id, title, vendor, modelNumber
          message[key] = data[key];
          break;
      }
    });
    return message;
  }

  @Get()
  @Render('products')
  async getFilterProducts(@Query() query, @Query('page') currentPage) {
    try {
      currentPage = parseInt(currentPage);
      if (isNaN(currentPage)) {
        currentPage = 1;
      }
    } catch {
      currentPage = 1;
    }
    const limit = 50;
    const previousPage = currentPage > 1 ? currentPage - 1 : 1;
    const nextPage = +currentPage + 1;
    delete query['page'];
    const queryString = new URLSearchParams(query).toString();
    let products;

    const parameters = {};
    // Match initFilter.qtyVsStock(Hard code <option>)
    enum qtyVsStock {
      qtyGtStock = 'qty > warehouse_total',
      StockGtQty = 'warehouse_total > qty',
      QSEq5 = '(qty - warehouse_total) = 5',
      QSEq10 = '(qty - warehouse_total) = 10',
      QSGt10 = '(qty - warehouse_total) = 10',
    }
    if (Object.keys(query).length > 0) {
      for (const [key, value] of Object.entries(query)) {
        if (value) {
          switch (key) {
            case 'model_no':
            case 'id':
              parameters[key] = query[key]
                .trim()
                .replace(new RegExp(',', 'g'), '|');
              break;
            case 'name':
            case 'sx_name':
            case 'series':
            case 'barcode':
            case 'gender':
            case 'brand':
            case 'size':
            case 'location':
            case 'category':
            case 'withoutSize':
              parameters[key] = query[key].trim();
              break;
            case 'qtyVsStock':
              parameters[key] = qtyVsStock[query[key]] ?? '';
              break;
            case 'warehouse':
              if (query.warehouse && query.qtyOperator && query.qty) {
                parameters[key] = [
                  query.warehouse,
                  query.qtyOperator,
                  query.qty,
                ];
              }
              break;
            case 'qtyOperator':
            case 'qty':
              break;
            case 'createDateFrom':
            case 'createDateTo':
              parameters[key] = Date.parse(query[key]) / 1000;
              break;
          }
        }
      }
    }
    if (Object.keys(parameters).length > 0) {
      products = await this.productService.getFilterProducts(
        parameters,
        query.sortBy,
        currentPage,
        limit,
      );
    } else {
      products = await this.productService.getProducts(currentPage, limit);
    }
    // Map Products in Report View
    await Promise.all(
      products.map((product) => this.mapProducts(product)),
    ).then();
    // Init Filter
    const initFilter = await this.initFilter(query);
    return {
      products: products,
      queryString: queryString,
      currentPage: currentPage,
      previousPage: previousPage,
      nextPage: nextPage,
      initFilter: initFilter,
      productFilterData: productFilterData.productFilterData,
    };
  }

  //Product detail view page
  @Get('view/:id')
  @Render('product')
  async getProductDetail(@Param('id') product_id: number) {
    const productDetail = await this.productService.getProductDetail(
      product_id,
    );
    const categories = [];
    let category = await this.categoryService.getByProductId(product_id, 2);
    while (category) {
      categories.push(category.name);
      category = await this.categoryService.getByProductId(
        product_id,
        category.id,
      );
    }
    productDetail.releasedate = this.parseDateString(productDetail.releasedate);
    productDetail.sortdate = this.parseDateString(productDetail.sortdate);
    const detailColorOpt = await this.productService.getColor_option();
    const selectedLocation = await this.categoryService.getSelectedCategories(
      product_id,
      'location',
    );
    const selectedGender = await this.categoryService.getSelectedCategories(
      product_id,
      'gender',
    );
    const selectedType = await this.categoryService.getSelectedCategories(
      product_id,
      'type',
    );
    detailColorOpt.find((element) => {
      return (element.optionSelected =
        element.magentoID == productDetail.color_option);
    });

    let detailPayment = '';
    switch (productDetail.payment_gateway) {
      case 'both':
      case 'payvision':
      case 'paypal':
        detailPayment = productDetail.payment_gateway;
        break;
      default:
        detailPayment = '';
        break;
    }
    // Product Description
    const shopifyProduct = await this.shopifyProductService.DBGetByModelNo(
      productDetail.model_no,
    );
    let description, status;
    let showShopifyDescription;
    let showShopify = false;
    if (shopifyProduct) {
      showShopify = true;
      status = shopifyProduct.status;
      description = this.getDescriptionBody(shopifyProduct.body_html);
      showShopifyDescription = (
        await this.productService.getShow_description(productDetail.id)
      ).show_description;
      productDetail['vendor'] = shopifyProduct.vendor;
    }

    const images = await this.nexusApiService.fetchCurrentImagesByModelNumber(
      productDetail.model_no,
    );

    return {
      productDetail: productDetail,
      detailColorOpt: detailColorOpt,
      detailPayment: detailPayment,
      selectedLocation: selectedLocation,
      categories: categories,
      selectedGender: selectedGender,
      selectedType: selectedType,
      description: description,
      showShopifyDescription: showShopifyDescription,
      showShopify: showShopify,
      status: status,
      images,
    };
  }

  //Edit Product Form
  @Get('edit/:id')
  @Render('productEdit')
  async getProductDetailEdit(@Param('id') product_id: number) {
    const productDetail = await this.productService.getProductDetail(
      product_id,
    );
    const categoriesID = [];
    const categoryObj = {};
    const categoryListName = 'category_';
    let category = await this.categoryService.getByProductId(product_id, 2);

    while (category) {
      categoriesID.push(category.id);
      category = await this.categoryService.getByProductId(
        product_id,
        category.id,
      );
    }
    productDetail.releasedate = this.parseDateString(productDetail.releasedate);
    productDetail.sortdate = this.parseDateString(productDetail.sortdate);
    const detailColorOpt = await this.productService.getColor_option();
    const detailClass = await this.categoryService.getChildren(36);
    const detailAttributes = await this.categoryService.getChildren(14);
    const detailGender = await this.categoryService.getChildren(4);
    const detailType = await this.categoryService.getChildren(3);
    const detailShow = await this.categoryService.getChildren(177);
    const detailLocation = await this.categoryService.getChildren(264);
    const selectedCategories = await this.getSelectedCategories(product_id, [
      'location',
      'class',
      ['show', 'shop'],
      ['type', 'gender', 'attribute'],
    ]);

    const categoryList = await this.categoryService.getChildren(2);

    categoryObj[categoryListName + '1'] = categoryList;
    categoryObj['category_1'].find((element) => {
      return (element.selected = element.id == categoriesID[0]);
    });
    for (let i = 0; i < categoriesID.length - 1; i++) {
      const list = await this.categoryService.getChildren(categoriesID[i]);
      list.find(
        (element) => (element.selected = element.id == categoriesID[i + 1]),
      );
      categoryObj[categoryListName + (i + 2)] = list;
    }
    detailColorOpt.find(
      (element) =>
        (element.optionSelected =
          element.magentoID == productDetail.color_option),
    );

    function checking(detailChecking, selectedChecking) {
      detailChecking.forEach(function (element) {
        selectedChecking.find(
          (selected) => (element.selected = element.id == selected.category_id),
        );
      });
    }
    checking(detailAttributes, selectedCategories[3]);
    checking(detailGender, selectedCategories[3]);
    checking(detailType, selectedCategories[3]);
    checking(detailShow, selectedCategories[2]);
    checking(detailClass, selectedCategories[1]);
    checking(detailLocation, selectedCategories[0]);

    const detailPayment = {
      both: productDetail.payment_gateway == 'both',
      payvision: productDetail.payment_gateway == 'payvision',
      paypal: productDetail.payment_gateway == 'paypal',
    };

    // Shopify product_type
    const product_types = await this.productService.getProduct_type();

    // Shopify vendor
    const vendors = await this.shopifyProductService.DBgetVendor();

    // Shopify
    const shopifyProduct = await this.shopifyProductService.DBGetByModelNo(
      productDetail.model_no,
    );
    let description, status;
    let showShopifyDescription;
    let showShopify = false;
    if (shopifyProduct) {
      showShopify = true;
      status = shopifyProduct.status;
      description = this.getDescriptionBody(shopifyProduct.body_html);
      showShopifyDescription = (
        await this.productService.getShow_description(productDetail.id)
      ).show_description;
      productDetail['vendor'] = shopifyProduct.vendor;
    }

    const images = await this.imageService.findByModelNo(
      productDetail.model_no,
    );

    return {
      productDetail: productDetail,
      detailColorOpt: detailColorOpt,
      detailClass: detailClass,
      detailAttributes: detailAttributes,
      detailGender: detailGender,
      detailType: detailType,
      detailShow: detailShow,
      detailPayment: detailPayment,
      detailLocation: detailLocation,
      selectedLocation: selectedCategories[0],
      selectedClass: selectedCategories[1],
      categoryObj: categoryObj,
      description: description,
      showShopifyDescription: showShopifyDescription,
      showShopify: showShopify,
      status: status,
      product_types: product_types,
      vendors,
      images,
    };
  }

  @Get('edit/:model_no/image')
  @Render('productEditImage')
  async productEditImage(@Param('model_no') model_no: string) {
    const imageUris =
      await this.nexusApiService.fetchAllSourceImagesByModelNumber(model_no);
    const onlineImageUrl =
      await this.nexusApiService.fetchCurrentImagesByModelNumber(model_no);
    const imageCount = imageUris.length;

    const imageItems = imageUris.map((imageUri) => {
      const splitted = imageUri.split('/');
      const fileName = splitted.pop();
      const source = splitted.pop();
      const imageUrl = imageUri;
      const options = Array.from({ length: imageCount }, (_, i) => ({
        index: i + 1,
        selected: onlineImageUrl.indexOf(imageUrl) === i,
      }));
      return {
        imageUrl,
        source,
        fileName,
        options,
      };
    });
    return {
      modelNumber: model_no,
      productImages: imageItems,
    };
  }

  @Post('edit/:model_no/image')
  async editProductImage(
    @Param('model_no') model_no: string,
    @Body() image_urls,
  ) {
    const imageUrls = image_urls.flatMap((c) => c.imageUrl);
    const result = await this.nexusApiService.updateImagesByModelNumber(
      model_no,
      imageUrls,
    );

    return result;
  }

  @Get('export/KC/:id')
  async export(@Param('id') id: string) {
    switch (id) {
      case 'du':
        const du = await this.productService.getDuProducts();
        return JSONToExcelConvertor(du, 'Du');
      case 'kream':
        const kream = await this.productService.getKreamProducts();
        return JSONToExcelConvertor(kream, 'Kream');
      case 'nice':
        const nice = await this.productService.getNiceProducts();
        return JSONToExcelConvertor(nice, 'Nice');
      case 'marathon':
        const marathon = await this.productService.getMarathonProducts();
        return JSONToExcelConvertor(marathon, 'Marathon');
      case 'footlockerHK':
        const footlockerHK =
          await this.productService.getFootlockerHKProducts();
        return JSONToExcelConvertor(footlockerHK, 'FootlockerHK');
      default:
        const products = await this.snkrdunkproductService.getSnkrProducts();
        return JSONToExcelConvertor(products, 'Snkrdunk');
    }
  }
  @Get('export/shopify')
  async exportShopify() {
    const shopifyProducts =
      await this.productService.getShopifyProductsWithoutImage();
    return JSONToExcelConvertor(shopifyProducts, 'ShopifyProducts');
  }
  //Create Product Form
  @Get('create/')
  @Render('productCreate')
  async getCreateForm() {
    const category_1 = await this.categoryService.getChildren(2);
    const gender = await this.categoryService.getChildren(4);
    // Shopify product_type & vendor
    const product_types = await this.productService.getProduct_type();
    const vendors = await this.shopifyProductService.DBgetVendor();

    //Typo -> It should change in DB(sys_category[parent = 4].name)
    // ID: 9(Men), 10(Women)
    gender.map((ele) => {
      if (ele.name == 'Mens') ele.name = 'Men';
      if (ele.name == 'Womens') ele.name = 'Women';
    });
    const type = await this.categoryService.getChildren(3);
    // Utils
    // Get Today
    const date = new Date();
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    const today = yyyy + '-' + mm + '-' + dd;

    return {
      product_types: product_types,
      vendors: vendors,
      category_1: category_1,
      gender: gender,
      type: type,
      today: today,
    };
  }

  //Fetch result
  @Get('categories')
  async getCategories(@Query('id') id) {
    const categories = await this.categoryService.getChildren(id);
    return categories;
  }

  //Fetch size
  @Get('size')
  async getSize(@Query('id') id: number) {
    const size = await this.productService.getSizeByBrand(id);
    return size;
  }

  @Post('create/')
  @UseInterceptors(
    FilesInterceptor('images', undefined, {
      fileFilter: imageFileFilter,
    }),
  )
  async createProduct(
    @Body() body,
    @User() user,
    @Res() res,
    @UploadedFiles() images: Array<Express.Multer.File>,
  ) {
    // Frontend will do some validation
    const product = await this.productService.createProduct(body);
    const productId = product.raw.insertId;
    const modelNumber = body.model_no.toUpperCase();
    const inputCategories = [];

    // Handle Images
    /*if (images.length > 0) {
      const productDetail = this.productService.getProductDetail(productId);
      const imageTasks = images.map(async (image) =>
        this.imageService.uploadToBackend(image, await productDetail),
      );
    }*/

    // Handle Categories
    const regexp = new RegExp(/^category_/);
    for (const [key, value] of Object.entries(body)) {
      if ((regexp.test(key) || ['type', 'gender'].includes(key)) && value) {
        inputCategories.push(value);
      }
    }
    await this.productService.insertProductCategories(
      productId,
      inputCategories,
    );

    const hkdCurrency = (await this.productService.getCurrency(6)).currency;
    const jpyCurrency = (await this.productService.getCurrency(7)).currency;
    const hkdPrice = Math.round((body.usPrice * hkdCurrency) / 10) * 10;
    const jpyPrice = Math.round((body.usPrice * jpyCurrency) / 100) * 100;
    const cnPrice = (Math.round(body.usPrice * 7.8 * 0.8) / 10) * 10 + 50;
    const now = Math.floor(Date.now() / 1000);

    // Get Gender Name
    const genderStr = (await this.categoryService.getById(body.gender))?.name;

    const productObj = {
      modelNumber: modelNumber,
      name: body.product_name,
      body_html: `<p hidden>${modelNumber}</p>`,
      gender: genderStr,
      series: body.series,
      product_type: body.shopify_type,
      vendor: body.vendor,
    };

    // Collect metafields
    const metafields = {};

    Object.keys(body).forEach((key) => {
      if (key.startsWith('metafield_')) {
        if (body[key]) {
          // Collecting metafields for pub/sub message
          const keyStr = key.replace('metafield_', '');
          metafields[keyStr] = body[key];
        }
      }
    });
    productObj['metafields'] = metafields;

    // Insert Metafields to mgt_product_att
    // It will also affect tags
    await this.productService.updateMetafieldsByModelNumber(
      metafields,
      modelNumber,
    );
    const variants = [];
    if (body.size_range) {
      const sizeRanges = body.size_range.split(':');

      for (const size of sizeRanges) {
        const sizeData = await this.productService.getSizeByBrandAndGender(
          size,
          body.category_1, // Brand
        );

        if (sizeData) {
          let position = 1;
          for (const size of sizeData) {
            const variant = {};
            // TODO: Duplicate action -> Move to function
            console.log(position, size.name);
            const { sku, erpsku } = this.getSku(modelNumber, size);
            const response = await this.insertStock(
              productId,
              sku,
              erpsku,
              body.selling_qty,
              body.usPrice,
              hkdPrice,
              jpyPrice,
              cnPrice,
              now,
              size,
            );
            // If affectedRows > 1, it means the stock is already existed.
            // For those overlaped size.
            if (response.raw.affectedRows == 1) {
              variant['sku'] = sku;
              variant['size'] = size.name;
              variants.push(variant);
              position++;
            }
          }
        }
      }
    } else {
      const size = await this.productService.getFreeSize();
      const variant = {};

      if (size) {
        //Duplicate action -> Move to function
        const { sku, erpsku } = this.getSku(modelNumber, size);
        await this.insertStock(
          productId,
          sku,
          erpsku,
          body.selling_qty,
          body.usPrice,
          hkdPrice,
          jpyPrice,
          cnPrice,
          now,
          size,
        );
        variant['sku'] = sku;
        variant['size'] = size.name;
        variants.push(variant);
      }
    }
    productObj['variants'] = variants;
    // Insert to ProductExtneded
    await this.productService.insertBackendProductHandler(user.id, productId);
    console.log(productObj);
    const topicName = config.pubsubTopic.productUpdate.topicName;
    const pubsubAction = await this.pubSubService.publishMessage(
      topicName,
      productObj,
    );

    return res.redirect('/product/view/' + productId);
  }

  //function for Edit
  async insertFun(category, product_id) {
    if (category) {
      if (Array.isArray(category)) {
        category.forEach((element) => {
          this.productService.insertAttributes(element, product_id);
        });
      } else {
        this.productService.insertAttributes(category, product_id);
      }
    }
  }

  //Edit
  @Post('edit/:id')
  async updateProduct(@Param('id') id, @Body() body, @Res() res) {
    const updateData = {
      name: body.name,
      series: body.series,
      made_in: body.made_in,
      color: body.color,
      color_option: parseInt(body.magentolID) || 0,
      price: parseInt(body.price) || 0,
      payment_gateway: body.payment_gateway || null,
      releasedate: Date.parse(body.releasedate) / 1000,
      sortdate: Date.parse(body.sortdate) / 1000,
      product_type: body.product_type,
    };
    await this.productService.updateProduct(updateData, id);

    await this.stockService.updateStock(id);
    await this.productService.deleteProductCategories(id);
    await this.productService.insertAttributes(body.type, id);
    await this.productService.insertAttributes(body.gender, id);
    await this.insertFun(body.attributes, id);
    await this.insertFun(body.show, id);
    await this.insertFun(body.class, id);
    await this.insertFun(body.location, id);
    let count = 1;
    while (body['category_' + count]) {
      await this.productService.insertAttributes(body['category_' + count], id);
      count++;
    }

    //====== Shopify ======

    // Update shopify.product
    // Run graphql sync to shopify
    // Update shopify.productUploaded

    // SKU = model_no - xxxx

    const modelNumber = (await this.productService.getModelNoById(id)).model_no;
    const product = await this.shopifyProductService.DBGetByModelNo(
      modelNumber,
    );

    if (body.showOption && product) {
      const showDescription: boolean = body.showOption == 'show' ? true : false;
      const sku = product.sku;

      // wrap description with <div class='wrapper'> / <div class='wrapper' hidden>
      let description = '';
      description += showDescription
        ? `<div class='wrapper'>`
        : `<div class='wrapper' hidden>`;
      description += body.description + '</div>';

      console.log(description);

      // Get Gender Name
      const genderStr = (await this.categoryService.getById(body.gender))?.name;

      // Update DB
      const updateData = {
        name: body.name,
        series: body.series,
        modelNumber: modelNumber,
        gender: genderStr,
        body_html: description,
        status: body.status,
        product_type: body.product_type,
        vendor: body.vendor,
      };
      console.log(updateData);
      try {
        if (Object.keys(updateData).length > 0) {
          const updateShowDescription =
            await this.productService.updateShowDescription(
              id,
              showDescription,
            );
          const topicName = config.pubsubTopic.productUpdate.topicName;
          await this.pubSubService.publishMessage(topicName, updateData);
          console.log('PubSubData', updateData);
        }
      } catch (error) {
        console.log('Error: Editing Shopify Product');
        console.error(error);
      }
    }

    return res.redirect('/product/view/' + id);
  }

  @Get('softdelete/:id')
  async softDeleteProduct(@Param('id') id, @Res() res) {
    console.log('Soft Delete:', id);
    await this.productService.softDeleteProduct(id);

    return res.redirect(`/product/view/${id}`);
  }

  @Get('deleteForever/:id')
  async deleteProductForever(@Param('id') id, @Res() res) {
    console.log('Delete Forever:', id);
    await this.productService.deleteForever(id);

    return res.redirect(`/product`);
  }

  @Get('sqlite')
  // TEST AREA
  async getSqlite() {
    const model_no = (await this.productService.getModelNoById('174214'))
      .model_no;
    const product = await this.shopifyProductService.DBGetByModelNo(model_no);
    // ==========================================================
    // ==========================================================
    const data = await this.productService.getProductExtended().then();
    return data;
  }

  @Get('image/:id/delete')
  @Redirect()
  async deleteImage(@Param('id') pid: number, @Query('id') imageId: number) {
    const success = await this.imageService.deleteFromBackend(imageId);
    // TODO : error handling
    return { url: `/product/edit/${pid}#images` };
  }

  @Post('image/:id')
  @Redirect()
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: imageFileFilter,
    }),
  )
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Param('id') pid: number,
  ) {
    const product = await this.productService.getProductDetail(pid);
    await this.imageService.uploadToNexus(file, product);
    // TODO : error handling
    return { url: `/product/edit/${pid}#images` };
  }
  @Post('images/:id')
  @UseInterceptors(FilesInterceptor('files'))
  async uploadImages(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Body() body,
    @Param('id') pid: number,
    @Res() res,
  ) {
    if (files == undefined) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: `no data to upload`,
      });
    }
    if (Number.isNaN(pid)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: `Please refresh the page`,
      });
    }
    const product = await this.productService.getProductDetail(pid);
    for (let i = 0; i < files.length; i++) {
      //if check to square image
      if (body.squareList.includes(files[i].originalname)) {
        product.isSquare = true;
      } else {
        product.isSquare = false;
      }
      const response = await this.imageService.uploadToNexus(files[i], product);
      if (JSON.parse(JSON.stringify(response))['status'] != 'ok') {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: `image ${files[i].originalname} uploaded faild`,
        });
      } else if (i == files.length - 1) {
        return res.status(HttpStatus.OK).json({
          success: true,
          message: `image uploaded successfully`,
          url: `/product/edit/${product.model_no}/image`,
        });
      }
    }
  }

  @Get('calculateStock/:id')
  async triggerPriceStockCalculation(@Param('id') pid: number) {
    const result = await this.productService.triggerPriceStockCalculation(pid);
    return result;
  }

  @Get('calculateSku/:sku')
  async triggerSkuCalculation(@Param('sku') sku: string) {
    const result = await this.productService.triggerSkuCalculation(sku);
    return result;
  }

  @Get('resyncProduct/:id')
  async resyncProduct(@Param('id') id: number) {
    const response = await this.productService.resyncProduct(id);
    return { success: true, data: response };
  }

  @Get('resyncProducts')
  async resyncProducts() {
    const response = await this.productService.resyncProducts();
    return { success: true, data: response };
  }

  @Get('resyncImage/:sku')
  async triggerImageReSync(@Param('sku') sku: string) {
    const result = await this.nexusApiService.resyncImagesByModelNumber(sku);
    result.success = true;
    return result;
  }

  @Get('modelNumberAvailability/:modelNumber')
  async getModelNumberAvailability(@Param('modelNumber') modelNumber: string) {
    const result = await this.productService.getModelNumberAvailability(modelNumber);
    return result;
  }
}
