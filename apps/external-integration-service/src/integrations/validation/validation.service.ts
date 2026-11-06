import { Injectable } from "@nestjs/common";
import { ValidateInvestmentDto } from "./dto/validate-investment.dto";

@Injectable()
export class ValidationService {
  validateInvestment(dto: ValidateInvestmentDto) {
    const missingFields: string[] = [];

    if (!dto.nationalId?.trim()) {
      missingFields.push("nationalId");
    }

    if (!dto.taxRegistrationNumber?.trim()) {
      missingFields.push("taxRegistrationNumber");
    }

    const missingData = missingFields.length > 0;

    return {
      valid: !missingData,
      missingData,
      missingFields,
      investmentId: dto.investmentId,
      validatedAt: new Date().toISOString(),
    };
  }
}
