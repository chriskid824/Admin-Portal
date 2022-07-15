import { Module } from '@nestjs/common';
import { LegacyLogService } from './legacy-log.service';

@Module({
  providers: [LegacyLogService],
  exports: [LegacyLogService]
})
export class LegacyLogModule {}
