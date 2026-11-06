import { IsNumber, IsPositive } from "class-validator";

export class EvaluateRiskDto {
  @IsNumber()
  @IsPositive()
  investmentAmount: number;
}