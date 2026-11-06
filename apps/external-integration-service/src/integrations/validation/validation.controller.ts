import { Body, Controller, Post } from "@nestjs/common";
import { ValidationService } from "./validation.service";
import { ValidateInvestmentDto } from "./dto/validate-investment.dto";

@Controller("integrations/validation")
export class ValidationController {
  constructor(private readonly validationService: ValidationService) {}

  @Post("investment")
  validateInvestment(@Body() dto: ValidateInvestmentDto) {
    return this.validationService.validateInvestment(dto);
  }
}
