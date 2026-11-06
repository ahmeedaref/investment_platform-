import { Module } from '@nestjs/common';
import { ProviderHttpModule } from '../common/provider-http.module';
import { TaxClearanceController } from './tax-clearance.controller';
import { TaxClearanceService } from './tax-clearance.service';

@Module({
  imports: [ProviderHttpModule],
  controllers: [TaxClearanceController],
  providers: [TaxClearanceService],
  exports: [TaxClearanceService],
})
export class TaxClearanceModule { }
