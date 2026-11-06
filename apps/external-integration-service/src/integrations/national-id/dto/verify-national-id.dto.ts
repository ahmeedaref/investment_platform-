import { IsNotEmpty, IsString, Matches } from "class-validator";

export class VerifyNationalIdDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{14}$/)
  nationalId: string;

  @IsString()
  @IsNotEmpty()
  investorId: string;

  @IsString()
  @IsNotEmpty()
  investmentId: string;
}
