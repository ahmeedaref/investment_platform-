import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ClientsModule, Transport } from "@nestjs/microservices";

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: "RABBITMQ_CLIENT",
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.getOrThrow<string>("RABBITMQ_URL")],
            queue: configService.getOrThrow<string>(
              "RABBITMQ_DEFAULT_QUEUE",
            ),
            queueOptions: {
              durable: true,
            },
            persistent: true,
            noAck: true,
            prefetchCount: 10,
          },
        }),
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class MessagingModule { }
