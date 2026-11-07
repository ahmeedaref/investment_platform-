

import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app/app.module";
import { Transport } from "@nestjs/microservices";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const rabbitmqUrl = process.env.RABBITMQ_URL;
const rabbitmqQueue = process.env.RABBITMQ_DEFAULT_QUEUE;

if (!rabbitmqUrl || !rabbitmqQueue) {
  throw new Error("RabbitMQ environment variables are missing");
}

app.connectMicroservice({
  transport: Transport.RMQ,
  options: {
    urls: [rabbitmqUrl],
    queue: rabbitmqQueue,
    queueOptions: {
      durable: true,
    },
    noAck: false,
    prefetchCount: 10,
  },
});

await app.startAllMicroservices();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const globalPrefix = "api";
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.WORKFLOW_SERVICE_PORT || 3001;
  await app.listen(port);
  // Set when Nx waits for this server to be ready
  if (process.env.NX_READY_SIGNAL_SOCKET) {
    try {
      // Function keeps TypeScript and bundlers from rewriting or bundling the import
      const load = new Function("s", "return import(s)") as (
        s: string,
      ) => Promise<{ emitReadySignal(server: unknown): boolean }>;
      (await load("@nx/js/ready-signal")).emitReadySignal(app.getHttpServer());
    } catch {
      // @nx/js isn't installed
    }
  }
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
}

bootstrap();
