import { apiClient } from "../axios-client";

// BCorDFWebApi's ImportController — POST api/Import/{compId}/{entity}. Rows
// are plain header->value maps; `__row` carries each row's position in the
// uploaded file so error messages can point at it.
export interface ImportRequest {
  siteId: string;
  dryRun: boolean;
  updateExisting: boolean;
  createMissing: boolean;
  rows: Record<string, string>[];
}

export type ImportRowStatus = "Created" | "Updated" | "Skipped" | "Error";

export interface ImportRowResult {
  rowNumber: number;
  key?: string | null;
  status: ImportRowStatus;
  messages: string[];
}

export interface ImportResult {
  entity: string;
  dryRun: boolean;
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  rows: ImportRowResult[];
  notes: string[];
}

// The server handles a request's rows one by one inside one transaction (~40-80 ms a row), and the Next proxy in front of
// it gives up on a request after 30 s - so a file of ~1000+ rows sent as a single request used to fail with a generic
// error. Rows are therefore sent in chunks, one request at a time; each chunk is its own transaction.
const CHUNK_SIZE = 250;

// Failed partway through a real import: `processed` rows were already saved by earlier chunks.
export class ImportChunkError extends Error {
  constructor(
    public readonly processed: number,
    public readonly cause: unknown,
  ) {
    super("Import stopped part-way");
  }
}

// Item categories: main categories first, so a sub category can name a parent from the same file even when the two end
// up in different chunks (the server applies the same ordering inside a chunk).
function orderForChunks(entity: string, rows: Record<string, string>[]) {
  if (entity !== "item-categories") return rows;
  const hasParent = (r: Record<string, string>) => (r.ParentCode ?? "").trim() !== "";
  return [...rows].sort((a, b) => Number(hasParent(a)) - Number(hasParent(b)));
}

export const importService = {
  run: async (
    compId: string,
    entity: string,
    userName: string,
    request: ImportRequest,
    onProgress?: (processed: number, total: number) => void,
  ): Promise<ImportResult> => {
    const rows = orderForChunks(entity, request.rows);
    const merged: ImportResult = {
      entity,
      dryRun: request.dryRun,
      total: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      rows: [],
      notes: [],
    };

    onProgress?.(0, rows.length);
    for (let start = 0; start < rows.length; start += CHUNK_SIZE) {
      let data: ImportResult;
      try {
        ({ data } = await apiClient.post<ImportResult>(
          `/Import/${compId}/${entity}`,
          { ...request, rows: rows.slice(start, start + CHUNK_SIZE) },
          { params: { userName }, timeout: 5 * 60 * 1000 },
        ));
      } catch (err) {
        throw new ImportChunkError(request.dryRun ? 0 : start, err);
      }
      merged.entity = data.entity;
      merged.total += data.total;
      merged.created += data.created;
      merged.updated += data.updated;
      merged.skipped += data.skipped;
      merged.failed += data.failed;
      merged.rows.push(...data.rows);
      merged.notes = Array.from(new Set([...merged.notes, ...data.notes]));
      onProgress?.(Math.min(start + CHUNK_SIZE, rows.length), rows.length);
    }

    merged.rows.sort((a, b) => a.rowNumber - b.rowNumber);
    return merged;
  },
};
