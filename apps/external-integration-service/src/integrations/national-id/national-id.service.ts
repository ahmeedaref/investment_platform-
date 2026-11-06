import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ProviderHttpClient } from "../common/provider-http.client";
import { ExternalProviderConfig } from "../config/integration.config";
import { VerifyNationalIdDto } from "./dto/verify-national-id.dto";

@Injectable()
export class NationalIdService {
  private readonly provider: ExternalProviderConfig;

  constructor(
    private readonly httpClient: ProviderHttpClient,
    private readonly configService: ConfigService,
  ) {
    this.provider = {
      baseUrl: this.configService.get<string>("NATIONAL_ID_API_URL", ""),
      apiKey: this.configService.get<string>("NATIONAL_ID_API_KEY"),
      timeout: this.configService.get<number>("EXTERNAL_API_TIMEOUT", 10000),
    };
  }

  async verify(dto: VerifyNationalIdDto) {
    if (!this.provider.baseUrl) {
      return {
        verified: true,
        provider: "MOCK",
        nationalId: dto.nationalId,
        investorId: dto.investorId,
        investmentId: dto.investmentId,
        verifiedAt: new Date().toISOString(),
      };
    }

    return this.httpClient.request(
      "National ID verification",
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
          nationalId: dto.nationalId,
          investorId: dto.investorId,
          investmentId: dto.investmentId,
        },
      },
    );
  }
}
