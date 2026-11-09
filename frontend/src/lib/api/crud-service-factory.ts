import { apiClient } from "./axios-client";
import type { ApiEnvelope, ListQuery, PagedResult } from "@/types/common";

/**
 * Every master/transaction module (Item, Customer, Supplier, Purchase Order,
 * GRN, Sales Invoice, Stock Transfer, ...) exposes the same REST shape on
 * the ASP.NET Core side (see 07-api-structure.md). Rather than hand-write
 * near-identical list/get/create/update/delete calls ~12 times, one factory
 * produces a typed client per resource path.
 */
export function createCrudService<TEntity, TFormValues>(resourcePath: string) {
  return {
    list: async (query: ListQuery = {}): Promise<PagedResult<TEntity>> => {
      const { data } = await apiClient.get<ApiEnvelope<PagedResult<TEntity>>>(resourcePath, {
        params: query,
      });
      return data.data;
    },

    getById: async (id: string): Promise<TEntity> => {
      const { data } = await apiClient.get<ApiEnvelope<TEntity>>(`${resourcePath}/${id}`);
      return data.data;
    },

    create: async (payload: TFormValues): Promise<TEntity> => {
      const { data } = await apiClient.post<ApiEnvelope<TEntity>>(resourcePath, payload);
      return data.data;
    },

    update: async (id: string, payload: TFormValues): Promise<TEntity> => {
      const { data } = await apiClient.put<ApiEnvelope<TEntity>>(
        `${resourcePath}/${id}`,
        payload,
      );
      return data.data;
    },

    remove: async (id: string): Promise<void> => {
      await apiClient.delete(`${resourcePath}/${id}`);
    },
  };
}
