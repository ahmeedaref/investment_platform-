import { Body, Controller, Post } from "@nestjs/common";
import { NationalIdService } from "./national-id.service";
import { VerifyNationalIdDto } from "./dto/verify-national-id.dto";

@Controller("integrations/national-id")
export class NationalIdController {
  constructor(private readonly nationalIdService: NationalIdService) {}

  @Post("verify")
  verify(@Body() dto: VerifyNationalIdDto) {
    return this.nationalIdService.verify(dto);
  }
}
