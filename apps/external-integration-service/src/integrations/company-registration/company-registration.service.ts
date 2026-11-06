
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProviderHttpClient } from '../common/provider-http.client';
import { ExternalProviderConfig } from '../config/integration.config';
import { RegisterCompanyDto } from './dto/register-company.dto';

@Injectable()
export class CompanyRegistrationService {
  private readonly logger = new Logger(CompanyRegistrationService.name);
  private readonly provider: ExternalProviderConfig;

  constructor(
    private readonly httpClient: ProviderHttpClient,
    private readonly configService: ConfigService,
  ) {
    this.provider = {
      baseUrl: this.configService.get<string>(
        'COMPANY_REGISTRATION_API_URL',
        '',
      ),
      apiKey: this.configService.get<string>(
        'COMPANY_REGISTRATION_API_KEY',
      ),
      timeout: this.configService.get<number>(
        'EXTERNAL_API_TIMEOUT',
        10000,
      ),
    };
  }

  async register(dto: RegisterCompanyDto) {
    if (!this.provider.baseUrl) {
      this.logger.warn(
        'Using mock company registration provider (POC mode).',
      );

      return {
        success: true,
        mock: true,
        investmentId: dto.investmentId,
        investorId: dto.investorId,
        companyName: dto.companyName,
        registrationNumber: `POC-${Date.now()}`,
        status: 'REGISTERED',
        registeredAt: new Date().toISOString(),
      };
    }

    return this.httpClient.request(
      'Company Registration',
      this.provider,
      '/register',
      {
        method: 'POST',
        headers: {
          ...(this.provider.apiKey
            ? { Authorization: `Bearer ${this.provider.apiKey}` }
            : {}),
        },
        data: dto,
      },
    );
  }
}
