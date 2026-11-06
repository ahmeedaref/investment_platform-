import { Module } from "@nestjs/common";
import { DatabaseModule } from "@investment-platform/database";
import { InvestmentController } from "./investment.controller";
import { InvestmentService } from "./investment.service";

@Module({
  imports: [DatabaseModule],
  controllers: [InvestmentController],
  providers: [InvestmentService],
})
export class InvestmentModule {}
