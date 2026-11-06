import { Body, Controller, Post } from '@nestjs/common';
import { TaxClearanceService } from './tax-clearance.service';
import { VerifyTaxClearanceDto } from './dto/verify-tax-clearance.dto';

@Controller('integrations/tax-clearance')
export class TaxClearanceController {
  constructor(
    private readonly taxClearanceService: TaxClearanceService,
  ) { }

  @Post('verify')
  verify(@Body() dto: VerifyTaxClearanceDto) {
    return this.taxClearanceService.verify(dto);
  }
}
