import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ProviderHttpClient } from "../common/provider-http.client";
import { ExternalProviderConfig } from "../config/integration.config";
import { VerifyTaxClearanceDto } from "./dto/verify-tax-clearance.dto";

@Injectable()
export class TaxClearanceService {
  private readonly provider: ExternalProviderConfig;

  constructor(
    private readonly httpClient: ProviderHttpClient,
    private readonly configService: ConfigService,
  ) {
    this.provider = {
      baseUrl: this.configService.get<string>("TAX_CLEARANCE_API_URL", ""),
      apiKey: this.configService.get<string>("TAX_CLEARANCE_API_KEY"),
      timeout: this.configService.get<number>("EXTERNAL_API_TIMEOUT", 10000),
    };
  }

  async verify(dto: VerifyTaxClearanceDto) {
    // POC mock provider
    if (!this.provider.baseUrl) {
      return {
        cleared: true,
        provider: "MOCK",
        taxRegistrationNumber: dto.taxRegistrationNumber,
        investorId: dto.investorId,
        investmentId: dto.investmentId,
        verifiedAt: new Date().toISOString(),
      };
    }

    return this.httpClient.request(
      "Tax Clearance",
      this.provider,
      "/verify",
      {
        method: "POST",
        headers: {
          ...(this.provider.apiKey
            ? { Authorization: `Bearer ${this.provider.apiKey}` }
            : {}),
        },
        data: {
          taxRegistrationNumber: dto.taxRegistrationNumber,
          investorId: dto.investorId,
          investmentId: dto.investmentId,
        },
      },
    );
  }
}
