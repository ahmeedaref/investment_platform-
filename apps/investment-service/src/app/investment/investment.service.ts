import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "@investment-platform/database";
import { CreateInvestmentDto } from "./dto/create-investment.dto";

@Injectable()
export class InvestmentService {
  private readonly logger = new Logger(InvestmentService.name);
  private readonly workflowServiceUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.workflowServiceUrl = this.configService
      .getOrThrow<string>("WORKFLOW_SERVICE_URL")
      .replace(/\/$/, "");
  }

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
      where: {
        keycloakId: keycloakUser.sub,
      },
      update: {},
      create: {
        keycloakId: keycloakUser.sub,
        email: keycloakUser.email,
        firstName: keycloakUser.given_name ?? null,
        lastName: keycloakUser.family_name ?? null,
      },
    });

    const investment = await this.prisma.investment.create({
      data: {
        companyName: dto.companyName,
        investmentAmount: dto.investmentAmount,
        nationalId: dto.nationalId,
        taxRegistrationNumber: dto.taxRegistrationNumber,
        investorId: investor.id,
      },
    });

    try {
      const response = await fetch(
        `${this.workflowServiceUrl}/flowable/start-investment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            investmentId: investment.id,
            investorId: investor.id,
            investorEmail: investor.email,
            companyName: investment.companyName,
            investmentAmount: Number(investment.investmentAmount),
            nationalId: investment.nationalId,
            taxRegistrationNumber: investment.taxRegistrationNumber,
          }),
        },
      );

      if (!response.ok) {
        const errorBody = await response.text();

        this.logger.error(
          `Workflow Service error: ${response.status} ${errorBody}`,
        );

        throw new Error(
          `Workflow Service returned status ${response.status}`,
        );
      }

      const workflow = (await response.json()) as { id: string };

      if (!workflow.id) {
        throw new Error("Workflow Service returned no process instance ID");
      }

      return await this.prisma.investment.update({
        where: { id: investment.id },
        data: {
          processInstanceId: workflow.id,
          status: "IN_PROGRESS",
        },
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
    } catch (error) {
      this.logger.error(
        `Failed to start workflow for investment ${investment.id}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw new InternalServerErrorException(
        `Investment ${investment.id} was saved, but its workflow could not be started.`,
      );
    }
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
