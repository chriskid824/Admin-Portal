import {
  Controller,
  Get,
  HttpStatus,
  Param,
  Render,
  Query,
  Post,
  Body,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ShippingService } from './shipping.service';
import { OrderService } from 'src/order/order.service';
import { Courier } from './shippingConfig';

// TODO: Refactor to follow Nest.js providers pattern
// https://docs.nestjs.com/providers
@Controller('shipping')
export class ShippingController {
  constructor(
    private readonly shippingService: ShippingService,
    private readonly orderService: OrderService,
  ) { }

  @Get()
  @Render('shipping')
  async shipping(@Param('id') id: string) {
    return null;
  }

  @Post('create')
  async createShipmentBulk(
    @Res({ passthrough: true }) res,
    @Body('orderFilter') orderFilter,
    @Body('courier') courier?: Courier,
  ) {
    const { orders } = await this.orderService.findByUrlQuery(orderFilter, 1);
    const result = await this.shippingService.createShipments(orders, courier);

    if (result.length) {
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="AWB.pdf"',
      });
      return new StreamableFile(result);
    } else {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send();
    }
  }

  @Post('search')
  @Render('shipping')
  async postShipping(@Body() body, @Res() res, @Query() query) {
    const get = true;
    if (body) {
      const shippingData = await this.shippingService.getBytransitionID(body.transitionID);
      return { shippingData, get };
    }
    return null;
  }

  @Get('search')
  @Render('shipping')
  async getShipping(@Body() body, @Res() res, @Query() query) {
    const get = true;
    if (query) {
      const shippingData = await this.shippingService.getBytransitionID(query.transitionID);
      return { shippingData, get };
    }
    return null;
  }

  @Get('update')
  async update(@Query() query, @Res() res) {
    if (query) {
      // Change Time zone
      const time = this.shippingService.changeTimezone(new Date(), 'Asia/Hong_Kong');
      // Get the Unix timestamps in GMT +8 to now
      const now = +time;
      const getSdo = await this.shippingService.getSdo(query.transitionID);
      let checkOK = await this.shippingService.checkWarehouse(getSdo.warehouse);
      // Format the time to yyyy-mm-dd hh:mm:ss
      const timeFormat = this.shippingService.timeFormat(time);
      if (checkOK) {
        const updateERPdelivery = this.shippingService.updateERPdelivery(getSdo.sdo, query.trackNum, 'Shipped', 0, timeFormat);
      }
      const updatestatus = await this.shippingService.updateStatus(query.trackNum);
      const insertBody = {
        tid: query.transitionID,
        userid: -1,
        rm_en: '',
        rm_cn: '',
        oldstatus: 0,
        newstatus: 608,
        tracking: query.trackNum,
        location: 'Addresss System',
        updatedate: (now / 1000),
        createdate: (now / 1000),
        deleted: 0,
      }
      const insertOrderEvent = await this.shippingService.insertOrderEvent(insertBody);
    }
    return res.redirect(`/shipping/search/?transitionID=${query.transitionID}`);
  }

  @Get('uploadLetterheadSignature')
  @Render('fileupload')
  uploadLetterheadSignatureForm() {
    return {
      acceptedFileType: '.png,.gif',
      fileInputName: 'file',
    };
  }

  @Post('uploadLetterheadSignature')
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, callback) => {
        if (
          file.mimetype.slice(0, 5) !== 'image' ||
          !file.originalname.match(/\.(png|gif)$/)
        ) {
          callback(new Error('Only .png and .gif files are allowed!'), false);
        }
        callback(null, true);
      },
    }),
  )
  async uploadLetterheadSignature(
    @UploadedFile() file: Express.Multer.File,
  ) {
    const result = await this.shippingService.uploadLetterheadSignature(file);
    return { result };
  }
}
