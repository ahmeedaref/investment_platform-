import { Module } from "@nestjs/common";
import { DatabaseModule } from "@investment-platform/database";
import { FlowableModule } from "../flowable.module";
import { ApprovalController } from "./approval.controller";
import { ApprovalService } from "./approval.service";

@Module({
  imports: [DatabaseModule, FlowableModule],
  controllers: [ApprovalController],
  providers: [ApprovalService],
})
export class ApprovalModule { }
