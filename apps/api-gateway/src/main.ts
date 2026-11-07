
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { Request, Response } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { AppModule } from "./app/app.module";

async function bootstrap() {
  // Disable body parsing so the proxy can forward request streams correctly.
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  const targets = {
    investments: process.env.INVESTMENT_SERVICE_URL,
    approvals: process.env.WORKFLOW_SERVICE_URL,
    integrations: process.env.EXTERNAL_INTEGRATION_SERVICE_URL,
  };

  for (const [name, target] of Object.entries(targets)) {
    if (!target) {
      throw new Error(`Missing service URL: ${name}`);
    }
  }

  app.use(
    createProxyMiddleware({
      pathFilter: (_pathname, req) => {
        const path = new URL(
          (req as unknown as Request).originalUrl,
          "http://localhost",
        ).pathname;

        // Do not expose the internal investment status endpoint.
        if (/^\/api\/investments\/[^/]+\/internal-status\/?$/.test(path)) {
          return false;
        }

        return (
          path === "/api/investments" ||
          path.startsWith("/api/investments/") ||
          path === "/api/approvals" ||
          path.startsWith("/api/approvals/") ||
          path === "/api/integrations" ||
          path.startsWith("/api/integrations/")
        );
      },

      router: (req) => {
        const path = new URL(
          (req as unknown as Request).originalUrl,
          "http://localhost",
        ).pathname;

        if (
          path === "/api/investments" ||
          path.startsWith("/api/investments/")
        ) {
          return targets.investments!;
        }

        if (
          path === "/api/approvals" ||
          path.startsWith("/api/approvals/")
        ) {
          return targets.approvals!;
        }

        return targets.integrations!;
      },

      changeOrigin: true,

      logger: console,

      on: {
        error: (error, _req, res) => {
          Logger.error(`Gateway proxy error: ${error.message}`);

          const response = res as unknown as Response;

          if (!response.headersSent) {
            response.status(502).send("Bad Gateway");
          }
        },
      },
    }),
  );

  const port = process.env.API_GATEWAY_PORT || 3000;

  await app.listen(port);

  Logger.log(`API Gateway running at http://localhost:${port}/api`);
}

bootstrap();
