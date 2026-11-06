import { Module } from '@nestjs/common';
import { ProviderHttpModule } from '../common/provider-http.module';
import { NationalIdController } from './national-id.controller';
import { NationalIdService } from './national-id.service';

@Module({
  imports: [ProviderHttpModule],
  controllers: [NationalIdController],
  providers: [NationalIdService],
})
export class NationalIdModule {}