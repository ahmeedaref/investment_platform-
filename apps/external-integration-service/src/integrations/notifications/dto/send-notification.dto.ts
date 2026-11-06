import {
  IsEmail,
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class SendNotificationDto {
  @IsString()
  @IsNotEmpty()
  investmentId: string;

  @IsEmail()
  recipientEmail: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}
