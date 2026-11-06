import { Body, Controller, Post } from "@nestjs/common";
import { RiskService } from "./risk.service";
import { EvaluateRiskDto } from "./dto/evaluate-risk.dto";

@Controller("integrations/risk")
export class RiskController {
  constructor(private readonly riskService: RiskService) { }

  @Post("evaluate")
  async evaluateRisk(@Body() dto: EvaluateRiskDto) {
    return this.riskService.evaluateRisk(dto.investmentAmount);
  }
}