
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { timingSafeEqual } from "crypto";
import { InvestmentService } from "./investment.service";
import { CreateInvestmentDto } from "./dto/create-investment.dto";
import {
  KeycloakAuthGuard,
  Roles,
  RolesGuard,
} from "@investment-platform/auth";
import { ConfigService } from "@nestjs/config";

@Controller("investments")
export class InvestmentController {
  constructor(
    private readonly investmentService: InvestmentService,
    private readonly configService: ConfigService,
  ) { }

  @UseGuards(KeycloakAuthGuard)
  @Get()
  findAll() {
    return this.investmentService.findAll();
  }

  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @Roles("USER")
  @Post()
  create(
    @Req()
    request: {
      user: {
        sub: string;
        email: string;
        given_name?: string;
        family_name?: string;
      };
    },
    @Body() dto: CreateInvestmentDto,
  ) {
    return this.investmentService.create(dto, request.user);
  }

  @Post(":id/internal-status")
  updateInternalStatus(
    @Param("id") id: string,
    @Headers("x-internal-secret") providedSecret: string,
    @Body() body: { status: string },
  ) {

    const expectedSecret = this.configService.get<string>(
      "INTERNAL_SERVICE_SECRET",
    );


    if (!expectedSecret || !providedSecret) {
      throw new UnauthorizedException("Invalid internal credentials");
    }

    const expected = Buffer.from(expectedSecret);
    const provided = Buffer.from(providedSecret);

    if (
      expected.length !== provided.length ||
      !timingSafeEqual(expected, provided)
    ) {
      throw new UnauthorizedException("Invalid internal credentials");
    }

    if (!["APPROVED", "REJECTED"].includes(body.status)) {
      throw new BadRequestException("Status must be APPROVED or REJECTED");
    }

    return this.investmentService.updateStatus(
      id,
      body.status as "APPROVED" | "REJECTED",
    );
  }
}
