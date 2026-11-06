import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  MinLength,
  IsOptional,
  Matches,
} from "class-validator";

export class ValidateInvestmentDto {
  @IsString()
  @IsNotEmpty()
  investmentId: string;

  @IsString()
  @IsNotEmpty()
  investorId: string;

  @IsEmail()
  investorEmail: string;

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
