import { createCrudService } from "../crud-service-factory";
import { apiClient } from "../axios-client";
import type { ApiEnvelope } from "@/types/common";
import type { AppUser, IntegrationConfig } from "@/types/admin";
import type { UserFormValues } from "@/schemas/admin.schema";

export const userService = createCrudService<AppUser, UserFormValues>("/sysadmin/users");

export const integrationService = {
  list: async (): Promise<IntegrationConfig[]> => {
    const { data } = await apiClient.get<ApiEnvelope<IntegrationConfig[]>>(
      "/integrations/config",
    );
    return data.data;
  },
  update: async (key: string, payload: Partial<IntegrationConfig>) => {
    const { data } = await apiClient.put<ApiEnvelope<IntegrationConfig>>(
      `/integrations/config/${key}`,
      payload,
    );
    return data.data;
  },
};
