import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterCompanyDto {
  @IsString()
  @IsNotEmpty()
  investmentId: string;

  @IsString()
  @IsNotEmpty()
  investorId: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  companyName: string;

  @IsNumber()
  @IsPositive()
  investmentAmount: number;

  @IsEmail()
  investorEmail: string;
}
