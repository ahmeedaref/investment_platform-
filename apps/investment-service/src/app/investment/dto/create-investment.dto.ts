import {
  IsString,
  IsNotEmpty,
  MinLength,
  IsNumber,
  IsPositive,
  IsOptional,
  Matches,
} from "class-validator";

export class CreateInvestmentDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  companyName: string;

  @IsNumber()
  @IsPositive()
  investmentAmount: number;

  @IsOptional()
  @IsString()
  @Matches(/^\d{14}$/)
  nationalId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  taxRegistrationNumber?: string;
}
