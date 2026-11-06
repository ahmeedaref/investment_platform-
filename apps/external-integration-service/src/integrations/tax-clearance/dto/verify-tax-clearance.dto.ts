import {
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class VerifyTaxClearanceDto {
  @IsString()
  @IsNotEmpty()
  taxRegistrationNumber: string;

  @IsString()
  @IsNotEmpty()
  investorId: string;

  @IsString()
  @IsNotEmpty()
  investmentId: string;
}
