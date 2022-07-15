import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { RawData } from 'src/models/BaseModel';
import { BaseService } from 'src/models/BaseService';
import { ProductImage } from 'src/models/ProductImage';
import { Connection, SelectQueryBuilder } from 'typeorm';
import { formatDate } from 'src/utils';
import * as FormData from 'form-data';
import { lastValueFrom, Observable } from 'rxjs';
import config from 'src/config';
import { LegacyLogService } from 'src/legacy-log/legacy-log.service';
import { LegacyLogUpdateType } from 'src/models/LegacyLog';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { ProductService } from './product.service';
import { NexusApiService } from './nexusApi.service';
import { Destination } from 'src/models/ProductImage';

@Injectable()
export class ImageService extends BaseService {
  constructor(
    @InjectConnection('backend') protected connection: Connection,
    private httpService: HttpService,
    private productService: ProductService,
    private logService: LegacyLogService,
    private nexusApiService: NexusApiService,
  ) {
    super(connection);
  }

  protected tableName = 'sys_image';
  protected tableAlias = 'img';
  protected columns: string[] = [
    'id',
    'udt',
    'server_time_stamp',
    'file_name',
    'sequence',
    'model_no',
    'product_type',
  ];

  async find(id: number): Promise<ProductImage> {
    const row: RawData = await this.select()
      .where('id = :id', { id })
      .getRawOne();
    return ProductImage.rawToObject(row);
  }

  async findByFileName(fileName: string): Promise<ProductImage> {
    const row: RawData = await this.select()
      .where('file_name = :fileName', { fileName })
      .getRawOne();
    return ProductImage.rawToObject(row);
  }

  private async findOrdered(
    select: SelectQueryBuilder<any>,
  ): Promise<ProductImage[]> {
    const rows: RawData[] = await select
      .orderBy(this.tableAlias + '.udt', 'ASC')
      .orderBy(this.tableAlias + '.sequence', 'ASC')
      .getRawMany();
    return rows.map((r) => ProductImage.rawToObject(r));
  }

  async findByModelNo(modelNo: string): Promise<ProductImage[]> {
    return await this.findOrdered(
      this.select().where('model_no = :modelNo', { modelNo }),
    );
  }

  async findByProductId(productId: number): Promise<ProductImage[]> {
    const pTable = 'sys_product';
    const pAlias = 'product';
    return await this.findOrdered(
      this.select()
        .leftJoin(
          pTable,
          pAlias,
          `${pAlias}.model_no = ${this.tableAlias}.model_no`,
        )
        .where(pAlias + '.id = :productId', { productId }),
    );
  }

  async findNextSequenceByModelNo(modelNo: string): Promise<number> {
    const result = await this.select(['MAX(`sequence`) `sequence`'])
      .where('sequence < 9999')
      .andWhere('model_no = :modelNo', { modelNo })
      .getRawOne();
    return result['sequence'] + 1;
  }

  async create(
    fileName: string,
    fileTime: Date | number,
    product: RawData,
  ): Promise<any> {
    const sequence = await this.findNextSequenceByModelNo(product['model_no']);
    const timestamp: string = formatDate(fileTime, 'yyyy-MM-dd HH:mm:ss');
    const updateValues: QueryDeepPartialEntity<unknown> = {
      server_time_stamp: timestamp,
    };
    try {
      await this.insert()
        .values(
          Object.assign(
            {
              file_name: fileName,
              model_no: product['model_no'],
              sequence: sequence.toString(),
            },
            updateValues,
          ),
        )
        .execute();
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        await this.update()
          .set(updateValues)
          .where('file_name = :fileName', { fileName })
          .execute();
      } else {
        console.error(err);
      }
    }
    return this.findByFileName(fileName);
  }

  async deleteImage(id: number): Promise<any> {
    return this.delete().where('id = :id', { id }).execute();
  }

  async deleteByModelNo(modelNo: string): Promise<any> {
    return this.delete().where('model_no = :modelNo', { modelNo }).execute();
  }

  async deleteFile(image: ProductImage): Promise<any> {
    const formData: FormData = new FormData();
    formData.append('file_name', image.relativePath);
    formData.append('model_no', image.productModelNo);
    formData.append('method', 'delete');
    return this.postBackend(formData);
  }

  async deleteFilesByModelNo(modelNo: string): Promise<any> {
    const formData: FormData = new FormData();
    formData.append('model_no', modelNo);
    formData.append('method', 'deleteAll');
    return this.postBackend(formData);
  }

  async uploadFile(
    file: Express.Multer.File,
    product: RawData,
    des = Destination.Nexus,
  ): Promise<any> {
    console.info(product);
    console.info(product['model_no']);
    const formData: FormData = new FormData();
    formData.append('file', file.buffer, {
      filename: file.originalname,
    });
    formData.append('product', JSON.stringify(product));
    formData.append('modelNumber', product['model_no']);
    switch (des) {
      case Destination.Backend:
        return this.postBackend(formData);
      default:
        return this.postNexus(formData, product['model_no']);
    }
  }

  async postBackend(data, httpConfig = { headers: {} }): Promise<any> {
    const { headers = {} } = httpConfig;
    const source: Observable<any> = this.httpService
      .post(
        'https://hk.kickscrewseller.com/xhs_api/admin_portal/api_uploadProductPhoto.php',
        data,
        Object.assign({}, httpConfig, {
          headers: Object.assign({}, headers, {
            ...data.getHeaders(),
            'Content-Length': data.getLengthSync().toString(),
            [`apikey-${config.backend.var}`]: config.backend.key,
          }),
        }),
      )
      .pipe();
    const res = await lastValueFrom(source);
    return res.data;
  }

  async postNexus(data, model_no = ''): Promise<any> {
    return this.nexusApiService.uploadImagesByModelNumber(model_no, data);
  }

  async uploadToBackend(
    file: Express.Multer.File,
    product: RawData,
  ): Promise<any> {
    if (!file || !product) return false;
    const uploadResponse = await this.uploadFile(
      file,
      product,
      Destination.Backend,
    );
    if (!uploadResponse.success) return false;
    const fileName = uploadResponse['file_name'] ?? '';
    const fileTimestamp = (uploadResponse['file_timestamp'] ?? 0) * 1000;
    const createTask = this.create(fileName, fileTimestamp, product);
    this.writeLog(product.id, fileTimestamp);
    return createTask;
  }

  async uploadToNexus(
    file: Express.Multer.File,
    product: RawData,
  ): Promise<any> {
    if (!file || !product) return false;
    const uploadResponse = await this.uploadFile(
      file,
      product,
      Destination.Nexus,
    );
    return uploadResponse;
  }

  async deleteFromBackend(id: number): Promise<boolean> {
    const image = await this.find(id);
    if (!image) return true;
    const deleteResponse = await this.deleteFile(image);
    if (!deleteResponse.success) return false;
    this.deleteImage(id);
    const product = await this.productService.getByModelNo(
      image.productModelNo,
    );
    product && this.writeLog(product.id, new Date().getTime());
    return true;
  }

  async deleteFromBackendByProduct(productId: number): Promise<boolean> {
    const product = await this.productService.getProductDetail(productId);
    if (!product) return true;
    const modelNo = product['model_no'];
    const deleteResponse = await this.deleteFilesByModelNo(modelNo);
    if (!deleteResponse.success) return false;
    this.deleteByModelNo(modelNo);
    this.writeLog(productId, new Date().getTime());
    return true;
  }

  async writeLog(productId: number, timestamp: number): Promise<boolean> {
    const log = {
      pid: productId,
      updateType: LegacyLogUpdateType.Image,
      timestamp,
    } as RawData;
    return this.logService.writeLogByProductId(log);
  }
}
