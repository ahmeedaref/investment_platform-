import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ValidationModule } from "../integrations/validation/validation.module";
import { NationalIdModule } from "../integrations/national-id/national-id.module";
import { TaxClearanceModule } from '../integrations/tax-clearance/tax-clearance.module';
import { CompanyRegistrationModule } from '../integrations/company-registration/company-registration.module';
import { NotificationModule } from '../integrations/notifications/notification.module';
import { RiskModule } from "../integrations/risk/risk.module";
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    ValidationModule,
    NationalIdModule,
    TaxClearanceModule,
    CompanyRegistrationModule,
    NotificationModule,
    RiskModule


  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
