import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  KeycloakAuthGuard,
  Roles,
  RolesGuard,
} from "@investment-platform/auth";
import { ApprovalService } from "./approval.service";
import { ApprovalDecisionDto } from "./dto/approval-decision.dto";

interface AuthenticatedRequest {
  user: {
    sub: string;
    groups?: string[];
    realm_access?: {
      roles?: string[];
    };
  };
}

@Controller("approvals")
@UseGuards(KeycloakAuthGuard, RolesGuard)
@Roles("APPROVER")
export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) { }

  @Get("tasks")
  getMyTasks(@Req() request: AuthenticatedRequest) {
    return this.approvalService.getMyTasks(request.user);
  }

  @Post("tasks/:taskId/claim")
  claimTask(
    @Param("taskId") taskId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.approvalService.claimTask(taskId, request.user);
  }

  @Post("tasks/:taskId/decision")
  submitDecision(
    @Param("taskId") taskId: string,
    @Body() dto: ApprovalDecisionDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.approvalService.submitDecision(
      taskId,
      dto,
      request.user,
    );
  }
}
