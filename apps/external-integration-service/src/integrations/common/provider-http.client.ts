import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  BadGatewayException,
} from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { AxiosRequestConfig } from "axios";
import { firstValueFrom } from "rxjs";
import { ExternalProviderConfig } from "../config/integration.config";

@Injectable()
export class ProviderHttpClient {
  private readonly logger = new Logger(ProviderHttpClient.name);

  constructor(private readonly httpService: HttpService) {}

  async request<T>(
    providerName: string,
    provider: ExternalProviderConfig,
    path: string,
    config: AxiosRequestConfig = {},
  ): Promise<T> {
    if (!provider.baseUrl) {
      throw new ServiceUnavailableException(
        `${providerName} provider is not configured.`,
      );
    }

    const baseUrl = provider.baseUrl.replace(/\/+$/, "");
    const endpoint = path.replace(/^\/+/, "");

    try {
      const response = await firstValueFrom(
        this.httpService.request<T>({
          ...config,
          url: `${baseUrl}/${endpoint}`,
          timeout: provider.timeout,
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `${providerName} request failed`,
        error instanceof Error ? error.stack : undefined,
      );

      throw new BadGatewayException(`${providerName} provider request failed.`);
    }
  }
}
