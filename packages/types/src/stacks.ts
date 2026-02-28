import type { TransportType, McpServer } from "./server";

export interface McpStack {
  name: string;
  description: string;
  servers: McpServer[];
  tags: string[];
  version: string;
  createdAt: string;
}

export interface StackServer {
  name: string;
  displayName?: string;
  description?: string;
  transport: TransportType;
  command?: string;
  args?: string[];
  url?: string;
  requiredEnvKeys: string[];
  iconUrl?: string;
}

export interface RegistryServer {
  id: string;
  qualifiedName: string;
  displayName: string;
  description: string;
  iconUrl?: string;
  verified?: boolean;
  useCount?: number;
  homepage?: string;
  createdAt?: string;
}

export interface OAuthStatus {
  serverId: string;
  authenticated: boolean;
  provider?: string;
  expiresAt?: string;
}

export interface ActivityEntry {
  id: string;
  type: "sync" | "add" | "delete" | "import" | "auth" | "error" | "stack";
  description: string;
  timestamp: string;
  details?: string;
  clientId?: string;
  serverId?: string;
}
