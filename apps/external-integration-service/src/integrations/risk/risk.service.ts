import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from "@nestjs/common";
import { ZenEngine } from "@gorules/zen-engine";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

@Injectable()
export class RiskService implements OnModuleInit {
  private readonly logger = new Logger(RiskService.name);

  private engine: ZenEngine;
  private decision: any;

  async onModuleInit() {
    try {
      const decisionPath = resolve(
        process.cwd(),
        process.env.GORULES_DECISION_PATH ??
        "gorules-data/risk-engine.json",
      );

      const content = await readFile(decisionPath);

      this.engine = new ZenEngine();
      this.decision = this.engine.createDecision(content);

      this.logger.log("GoRules ZEN Engine initialized successfully");
    } catch (error) {
      this.logger.error("Failed to initialize GoRules ZEN Engine", error);
      throw error;
    }
  }

  async evaluateRisk(investmentAmount: number) {
    try {
      const response = await this.decision.evaluate({
        investmentAmount,
      });

      return {
        investmentAmount,
        ...response.result,
      };
    } catch (error) {
      this.logger.error("Risk evaluation failed", error);

      throw new InternalServerErrorException(
        "Failed to evaluate investment risk",
      );
    }
  }
}