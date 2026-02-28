import type { McpServer } from "./server";

export interface SyncResult {
  clientId: string;
  success: boolean;
  serversWritten: number;
  error?: string;
}

export interface ImportResult {
  added: number;
  skipped: number;
  servers: McpServer[];
}
