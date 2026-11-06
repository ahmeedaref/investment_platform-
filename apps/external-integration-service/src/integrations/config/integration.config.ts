export interface ExternalProviderConfig {
  baseUrl: string;
  apiKey?: string;
  timeout: number;
}

export interface IntegrationConfig {
  nationalId: ExternalProviderConfig;
  taxClearance: ExternalProviderConfig;
  companyRegistration: ExternalProviderConfig;
  notifications: ExternalProviderConfig;
}

export function getIntegrationConfig(): IntegrationConfig {
  const timeout = Number(process.env.EXTERNAL_API_TIMEOUT ?? 10000);

  return {
    nationalId: {
      baseUrl: process.env.NATIONAL_ID_API_URL ?? "",
      apiKey: process.env.NATIONAL_ID_API_KEY,
      timeout,
    },
    taxClearance: {
      baseUrl: process.env.TAX_CLEARANCE_API_URL ?? "",
      apiKey: process.env.TAX_CLEARANCE_API_KEY,
      timeout,
    },
    companyRegistration: {
      baseUrl: process.env.COMPANY_REGISTRATION_API_URL ?? "",
      apiKey: process.env.COMPANY_REGISTRATION_API_KEY,
      timeout,
    },
    notifications: {
      baseUrl: process.env.NOTIFICATION_API_URL ?? "",
      apiKey: process.env.NOTIFICATION_API_KEY,
      timeout,
    },
  };
}
