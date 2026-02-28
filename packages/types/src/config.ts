import type { McpServer } from "./server";

export interface McpConfig {
  servers: McpServer[];
  sync: ClientSyncConfig[];
}

export interface ClientSyncConfig {
  clientId: string;
  enabled: boolean;
  serverIds: string[];
  lastSynced?: string;
}

export interface AppSettings {
  launchAtLogin: boolean;
  startMinimized: boolean;
  autoSync: boolean;
  syncDelay: number;
  notifyExternal: boolean;
  backupRetention: number;
  syncNotifications: boolean;
  errorNotifications: boolean;
}
