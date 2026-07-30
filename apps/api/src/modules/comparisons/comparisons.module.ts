import { Module } from '@nestjs/common';
import { ComparisonsController, RankingsController } from './comparisons.controller';
import { ComparisonsService } from './comparisons.service';

@Module({
  controllers: [ComparisonsController, RankingsController],
  providers: [ComparisonsService],
  exports: [ComparisonsService],
})
export class ComparisonsModule {}
