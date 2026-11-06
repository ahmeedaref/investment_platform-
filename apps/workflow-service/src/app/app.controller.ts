import { Body, Controller, Get, Post } from "@nestjs/common";
import { AppService } from "./app.service";
import { FlowableService } from "./flowable.service";
import { StartInvestmentProcessDto } from "./dto/start-investment-process.dto";

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly flowableService: FlowableService,
  ) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  @Get("flowable/deployments")
  getDeployments() {
    return this.flowableService.getDeployments();
  }

  @Get("flowable/process-definitions")
  getProcessDefinitions() {
    return this.flowableService.getProcessDefinitions();
  }

  @Post("flowable/start-investment")
  startInvestmentProcess(@Body() dto: StartInvestmentProcessDto) {
    return this.flowableService.startInvestmentProcess(dto);
  }
}
