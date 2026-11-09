export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error: ApiError | null;
  meta?: { page?: number; pageSize?: number; total?: number; correlationId?: string };
}

export interface ApiError {
  errorCode: string;
  message: string;
  details?: Record<string, string[]>;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  sortField?: string;
  sortOrder?: "asc" | "desc";
}

export interface AuditFields {
  createdAt: string;
  createdByUserId: string;
  modifiedAt?: string | null;
  modifiedByUserId?: string | null;
}

export type EntityStatus = "Active" | "Inactive";
