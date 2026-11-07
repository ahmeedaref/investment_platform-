
import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "@investment-platform/database";
import { CreateInvestmentDto } from "./dto/create-investment.dto";

@Injectable()
export class InvestmentService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.investment.findMany({
      select: {
        id: true,
        companyName: true,
        investmentAmount: true,
        status: true,
        processInstanceId: true,
        investorId: true,
        createdAt: true,
        updatedAt: true,
        investor: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(
    dto: CreateInvestmentDto,
    keycloakUser: {
      sub: string;
      email: string;
      given_name?: string;
      family_name?: string;
    },
  ) {
    const investor = await this.prisma.user.upsert({
      where: { keycloakId: keycloakUser.sub },
      update: {},
      create: {
        keycloakId: keycloakUser.sub,
        email: keycloakUser.email,
        firstName: keycloakUser.given_name ?? null,
        lastName: keycloakUser.family_name ?? null,
      },
    });

    const investment = await this.prisma.$transaction(async (tx) => {
      const createdInvestment = await tx.investment.create({
        data: {
          companyName: dto.companyName,
          investmentAmount: dto.investmentAmount,
          nationalId: dto.nationalId,
          taxRegistrationNumber: dto.taxRegistrationNumber,
          investorId: investor.id,
        },
      });

      await tx.outboxEvent.create({
        data: {
          eventType: "investment.created",
          aggregateId: createdInvestment.id,
          payload: {
            investmentId: createdInvestment.id,
            investorId: investor.id,
            investorEmail: investor.email,
            companyName: createdInvestment.companyName,
            investmentAmount: Number(createdInvestment.investmentAmount),
            nationalId: createdInvestment.nationalId,
            taxRegistrationNumber: createdInvestment.taxRegistrationNumber,
          },
        },
      });

      return createdInvestment;
    });

    return this.prisma.investment.findUnique({
      where: { id: investment.id },
      select: {
        id: true,
        companyName: true,
        investmentAmount: true,
        status: true,
        processInstanceId: true,
        investorId: true,
        createdAt: true,
        updatedAt: true,
        investor: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async updateStatus(
    investmentId: string,
    status: "APPROVED" | "REJECTED",
  ) {
    const investment = await this.prisma.investment.findUnique({
      where: { id: investmentId },
      select: { id: true },
    });

    if (!investment) {
      throw new NotFoundException("Investment not found");
    }

    return this.prisma.investment.update({
      where: { id: investmentId },
      data: { status },
      select: {
        id: true,
        companyName: true,
        status: true,
        processInstanceId: true,
        updatedAt: true,
      },
    });
  }
}
