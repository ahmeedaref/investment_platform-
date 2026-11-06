import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { StartInvestmentProcessDto } from "./dto/start-investment-process.dto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

@Injectable()
export class FlowableService implements OnModuleInit {
  private readonly logger = new Logger(FlowableService.name);
  private readonly baseUrl: string;
  private readonly username: string;
  private readonly password: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService
      .getOrThrow<string>("FLOWABLE_BASE_URL")
      .replace(/\/$/, "");

    this.username = this.configService.getOrThrow<string>("FLOWABLE_USERNAME");

    this.password = this.configService.getOrThrow<string>("FLOWABLE_PASSWORD");
  }

  async onModuleInit(): Promise<void> {
    await this.request("/repository/deployments?size=1");

    this.logger.log("Successfully connected to Flowable REST API");

    await this.ensureProcessDeployed();
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const credentials = Buffer.from(
      `${this.username}:${this.password}`,
    ).toString("base64");

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Basic ${credentials}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();

      this.logger.error(`Flowable API error: ${response.status} ${errorBody}`);

      throw new InternalServerErrorException(
        `Flowable API request failed with status ${response.status}`,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  async getDeployments(): Promise<unknown> {
    return this.request("/repository/deployments");
  }

  async getProcessDefinitions(): Promise<unknown> {
    return this.request("/repository/process-definitions");
  }

 async startInvestmentProcess(
  data: StartInvestmentProcessDto,
): Promise<{ id: string }> {
  const integrationBaseUrl = (
    this.configService.get<string>("EXTERNAL_INTEGRATION_BASE_URL") ??
    "http://host.docker.internal:3002/api"
  ).replace(/\/$/, "");

  const internalServiceSecret =
    this.configService.getOrThrow<string>("INTERNAL_SERVICE_SECRET");

  const internalStatusUrl =
    "http://host.docker.internal:3000/api/investments";

  const internalStatusSecureHeaders =
    `x-internal-secret: ${internalServiceSecret}`;

  const validationPayload = {
    investmentId: data.investmentId,
    investorId: data.investorId,
    investorEmail: data.investorEmail,
    companyName: data.companyName,
    investmentAmount: data.investmentAmount,
    nationalId: data.nationalId ?? null,
    taxRegistrationNumber: data.taxRegistrationNumber ?? null,
  };

    const response = await this.request<{ id: string }>(
      "/runtime/process-instances",
      {
        method: "POST",
        body: JSON.stringify({
          processDefinitionKey: "investmentApproval",
          businessKey: data.investmentId,
          variables: [
            { name: "investmentId", value: data.investmentId },
            { name: "investorId", value: data.investorId },
            { name: "investorEmail", value: data.investorEmail },
            { name: "companyName", value: data.companyName },
            { name: "investmentAmount", value: data.investmentAmount },
            { name: "nationalId", value: data.nationalId ?? null },
            {
              name: "approvedStatusUrl",
              value: `${internalStatusUrl}/${data.investmentId}/internal-status`,
            },
            {
              name: "rejectedStatusUrl",
              value: `${internalStatusUrl}/${data.investmentId}/internal-status`,
            },
            {
              name: "approvedStatusBody",
              value: JSON.stringify({ status: "APPROVED" }),
            },
            {
              name: "rejectedStatusBody",
              value: JSON.stringify({ status: "REJECTED" }),
            },
            {
              name: "internalStatusSecureHeaders",
              value: internalStatusSecureHeaders,
            },
            {
              name: "taxRegistrationNumber",
              value: data.taxRegistrationNumber ?? null,
            },
            {
              name: "validateRequestUrl",
              value: `${integrationBaseUrl}/integrations/validation/investment`,
            },
            {
              name: "validationRequestBody",
              value: JSON.stringify(validationPayload),
            },
            {
              name: "nationalIdVerificationUrl",
              value: `${integrationBaseUrl}/integrations/national-id/verify`,
            },
            {
              name: "verificationRequestBody",
              value: JSON.stringify({
                investmentId: data.investmentId,
                investorId: data.investorId,
                nationalId: data.nationalId,
              }),
            },
            {
              name: "taxVerificationUrl",
              value: `${integrationBaseUrl}/integrations/tax-clearance/verify`,
            },
            {
              name: "taxRequestBody",
              value: JSON.stringify({
                investmentId: data.investmentId,
                investorId: data.investorId,
                taxRegistrationNumber: data.taxRegistrationNumber,
              }),
            },
            {
              name: "riskEvaluationUrl",
              value: `${integrationBaseUrl}/integrations/risk/evaluate`,
            },
            {
              name: "riskRequestBody",
              value: JSON.stringify({
                investmentAmount: data.investmentAmount,
              }),
            },
            {
              name: "companyRegistrationUrl",
              value: `${integrationBaseUrl}/integrations/company-registration/register`,
            },
            {
              name: "registrationRequestBody",
              value: JSON.stringify({
                investmentId: data.investmentId,
                investorId: data.investorId,
                companyName: data.companyName,
                investmentAmount: data.investmentAmount,
                investorEmail: data.investorEmail,
              }),
            },
            {
              name: "notificationUrl",
              value: `${integrationBaseUrl}/integrations/notifications/send`,
            },
            {
              name: "approvedNotificationBody",
              value: JSON.stringify({
                investmentId: data.investmentId,
                recipientEmail: data.investorEmail,
                subject: "Investment Approved",
                message: `Your investment application for ${data.companyName} has been approved and your company has been registered successfully.`,
              }),
            },
            {
              name: "rejectedNotificationBody",
              value: JSON.stringify({
                investmentId: data.investmentId,
                recipientEmail: data.investorEmail,
                subject: "Investment Rejected",
                message: `Your investment application for ${data.companyName} has been rejected.`,
              }),
            },
          ],
        }),
      },
    );

    this.logger.log(`Started investment workflow: ${response.id}`);

    return response;
  }


  private async ensureProcessDeployed(): Promise<void> {
    const result = await this.request<{
      data?: Array<{ key: string }>;
    }>(
      "/repository/process-definitions?key=investmentApproval&latest=true&size=1",
    );

    if (result.data?.some((definition) => definition.key === "investmentApproval")) {
      this.logger.log("Investment Approval process is already deployed");
      return;
    }

    const filePath = resolve(
      process.cwd(),
      "apps/workflow-service/src/assets/processes/investment-approval.bpmn",
    );

    const bpmnFile = await readFile(filePath);

    const formData = new FormData();

    formData.append(
      "file",
      new Blob([bpmnFile], { type: "application/xml" }),
      "investment-approval.bpmn20.xml",
    );

    formData.append("deploymentName", "Investment Approval");

    const credentials = Buffer.from(
      `${this.username}:${this.password}`,
    ).toString("base64");

    const response = await fetch(`${this.baseUrl}/repository/deployments`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        Accept: "application/json",
      },
      body: formData,
    });

    if (!response.ok) {
      const errorBody = await response.text();

      this.logger.error(
        `BPMN deployment failed: ${response.status} ${errorBody}`,
      );

      throw new InternalServerErrorException(
        "Failed to deploy Investment Approval BPMN process",
      );
    }

    const deployment = await response.json() as { id: string };

    this.logger.log(
      `Investment Approval BPMN deployed successfully: ${deployment.id}`,
    );
  }
}
