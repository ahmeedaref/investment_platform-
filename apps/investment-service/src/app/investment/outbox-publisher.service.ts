import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { lastValueFrom } from "rxjs";
import { PrismaService } from "@investment-platform/database";

@Injectable()
export class OutboxPublisherService
  implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPublisherService.name);
  private timer: ReturnType<typeof setInterval> | undefined;
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    @Inject("RABBITMQ_CLIENT")
    private readonly rabbitClient: ClientProxy,
  ) { }

  onModuleInit() {
    void this.publishPendingEvents();

    this.timer = setInterval(() => {
      void this.publishPendingEvents();
    }, 2000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async publishPendingEvents() {
    if (this.isProcessing) return;

    this.isProcessing = true;

    try {
      const events = await this.prisma.outboxEvent.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        take: 10,
      });

      for (const event of events) {
        try {
          await lastValueFrom(
            this.rabbitClient.emit(event.eventType, {
              eventId: event.id,
              ...(event.payload as Record<string, unknown>),
            }),
          );

          await this.prisma.outboxEvent.update({
            where: { id: event.id },
            data: {
              status: "PUBLISHED",
              publishedAt: new Date(),
              lastError: null,
            },
          });

          this.logger.log(`Published event ${event.id}`);
        } catch (error) {
          await this.prisma.outboxEvent.update({
            where: { id: event.id },
            data: {
              attempts: { increment: 1 },
              lastError:
                error instanceof Error
                  ? error.message.substring(0, 2000)
                  : "Unknown publishing error",
            },
          });

          this.logger.error(`Failed to publish event ${event.id}`);
        }
      }
    } catch (error) {
      this.logger.error(
        "Failed to process outbox events",
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.isProcessing = false;
    }
  }
}
