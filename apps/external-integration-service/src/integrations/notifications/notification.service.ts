
import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProviderHttpClient } from '../common/provider-http.client';
import { ExternalProviderConfig } from '../config/integration.config';
import { SendNotificationDto } from './dto/send-notification.dto';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly provider: ExternalProviderConfig;

  constructor(
    private readonly httpClient: ProviderHttpClient,
    private readonly configService: ConfigService,
  ) {
    this.provider = {
      baseUrl: this.configService.get<string>(
        'NOTIFICATION_API_URL',
        '',
      ),
      apiKey: this.configService.get<string>(
        'NOTIFICATION_API_KEY',
      ),
      timeout: this.configService.get<number>(
        'EXTERNAL_API_TIMEOUT',
        10000,
      ),
    };
  }

  async send(dto: SendNotificationDto) {
    if (!this.provider.baseUrl) {
      const result = {
        success: true,
        mock: true,
        investmentId: dto.investmentId,
        recipientEmail: dto.recipientEmail,
        subject: dto.subject,
        status: 'SENT',
        sentAt: new Date().toISOString(),
      };

      this.logger.log(
        `Mock notification sent to ${dto.recipientEmail} for investment ${dto.investmentId}`,
      );

      return result;
    }

    return this.httpClient.request(
      'Notification',
      this.provider,
      '/send',
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
