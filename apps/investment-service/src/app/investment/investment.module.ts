import { Module } from "@nestjs/common";
import { DatabaseModule } from "@investment-platform/database";
import { MessagingModule } from "@investment-platform/messaging";
import { InvestmentController } from "./investment.controller";
import { InvestmentService } from "./investment.service";
import { OutboxPublisherService } from "./outbox-publisher.service";

@Module({
  imports: [DatabaseModule, MessagingModule],
  controllers: [InvestmentController],
  providers: [InvestmentService, OutboxPublisherService],
})
export class InvestmentModule { }
