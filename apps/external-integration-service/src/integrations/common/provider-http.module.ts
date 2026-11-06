
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ProviderHttpClient } from './provider-http.client';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        timeout: configService.get<number>(
          'EXTERNAL_API_TIMEOUT',
          10000,
        ),
        maxRedirects: 3,
      }),
    }),
  ],
  providers: [ProviderHttpClient],
  exports: [ProviderHttpClient],
})
export class ProviderHttpModule {}
