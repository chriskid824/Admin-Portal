import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
// import { ErpController } from './erp.controller';
import { ErpService } from './erp.service';
import { SdoDbService } from './sdoDb.service';

@Module({
  imports: [HttpModule],
  // controllers: [ErpController],
  providers: [ErpService, SdoDbService],
  exports: [ErpService, SdoDbService]
})
export class ErpModule { }
