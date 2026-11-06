import { Module } from '@nestjs/common';
import { ProviderHttpModule } from '../common/provider-http.module';
import { CompanyRegistrationController } from './company-registration.controller';
import { CompanyRegistrationService } from './company-registration.service';

@Module({
  imports: [ProviderHttpModule],
  controllers: [CompanyRegistrationController],
  providers: [CompanyRegistrationService],
  exports: [CompanyRegistrationService],
})
export class CompanyRegistrationModule { }
