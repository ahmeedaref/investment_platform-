import { Body, Controller, Post } from '@nestjs/common';
import { CompanyRegistrationService } from './company-registration.service';
import { RegisterCompanyDto } from './dto/register-company.dto';

@Controller('integrations/company-registration')
export class CompanyRegistrationController {
  constructor(
    private readonly companyRegistrationService: CompanyRegistrationService,
  ) { }

  @Post('register')
  register(@Body() dto: RegisterCompanyDto) {
    return this.companyRegistrationService.register(dto);
  }
}
