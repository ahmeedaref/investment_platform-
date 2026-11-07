import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "@investment-platform/database";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { FlowableModule } from "./flowable.module";
import { ApprovalModule } from "./approval/approval.module";
import { InvestmentEventsController } from "./investment-events.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    DatabaseModule,
    FlowableModule,
    ApprovalModule,
  ],
  controllers: [
    AppController,
    InvestmentEventsController,
  ],
  providers: [AppService],
})
export class AppModule { }
