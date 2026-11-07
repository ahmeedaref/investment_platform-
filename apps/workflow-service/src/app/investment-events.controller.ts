import {
  Controller,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  EventPattern,
  Payload,
  RmqContext,
  Ctx
} from "@nestjs/microservices";
import { PrismaService } from "@investment-platform/database";
import { FlowableService } from "./flowable.service";
import { StartInvestmentProcessDto } from "./dto/start-investment-process.dto";

const RETRY_QUEUE = "investment-platform-events.retry";
const MAX_RETRIES = 3;

@Controller()
export class InvestmentEventsController {
  private readonly logger = new Logger(InvestmentEventsController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly flowableService: FlowableService,
  ) { }

  @EventPattern("investment.created")
  async handleInvestmentCreated(
    @Payload() data: StartInvestmentProcessDto,
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const message = context.getMessage();

    try {
      await this.processInvestmentCreated(data);

      channel.ack(message);

      this.logger.log(
        `Successfully processed investment.created: ${data.investmentId}`,
      );
    } catch (error) {
      const headers = message.properties.headers ?? {};
      const retryCount = Number(headers["x-retry-count"] ?? 0);
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (retryCount < MAX_RETRIES) {
        try {
          channel.sendToQueue(RETRY_QUEUE, message.content, {
            persistent: true,
            headers: {
              ...headers,
              "x-retry-count": retryCount + 1,
            },
          });

          channel.ack(message);

          this.logger.warn(
            `Investment ${data.investmentId} failed. Retry ${retryCount + 1}/${MAX_RETRIES}: ${errorMessage}`,
          );
        } catch (publishError) {
          this.logger.error(
            `Failed to publish retry for ${data.investmentId}: ${publishError}`,
          );

          channel.nack(message, false, true);
        }

        return;
      }

      this.logger.error(
        `Investment ${data.investmentId} exhausted retries. Sending to DLQ: ${errorMessage}`,
      );

      channel.nack(message, false, false);
    }
  }

  private async processInvestmentCreated(
    data: StartInvestmentProcessDto,
  ): Promise<void> {
    this.logger.log(
      `Received investment.created event: ${data.investmentId}`,
    );

    await this.prisma.$transaction(
      async (tx) => {
        // Serialize processing for this investment across consumers.
        await tx.$executeRaw`
          SELECT pg_advisory_xact_lock(
            hashtextextended(${data.investmentId}, 0)
          )
        `;

        const investment = await tx.investment.findUnique({
          where: { id: data.investmentId },
          select: {
            id: true,
            processInstanceId: true,
          },
        });

        if (!investment) {
          throw new NotFoundException(
            `Investment ${data.investmentId} not found`,
          );
        }

        if (investment.processInstanceId) {
          this.logger.warn(
            `Workflow already started for investment ${investment.id}`,
          );
          return;
        }

        // Recover if Flowable started but the DB update failed.
        const existingProcess =
          await this.flowableService.findInvestmentProcess(
            investment.id,
          );

        if (existingProcess) {
          await tx.investment.update({
            where: { id: investment.id },
            data: {
              processInstanceId: existingProcess.id,
              status: "IN_PROGRESS",
            },
          });

          this.logger.warn(
            `Recovered existing Flowable process ${existingProcess.id} for investment ${investment.id}`,
          );

          return;
        }

        const process =
          await this.flowableService.startInvestmentProcess(data);

        await tx.investment.update({
          where: { id: investment.id },
          data: {
            processInstanceId: process.id,
            status: "IN_PROGRESS",
          },
        });

        this.logger.log(
          `Workflow ${process.id} started for investment ${investment.id}`,
        );
      },
      {
        maxWait: 10000,
        timeout: 30000,
      },
    );
  }
}
