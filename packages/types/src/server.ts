export type TransportType = "stdio" | "sse" | "streamableHttp";

export interface McpServer {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  iconUrl?: string;
  transport: TransportType;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  secretEnvKeys?: string[];
  url?: string;
  enabled: boolean;
  source?: string;
  tags?: string[];
  registryId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AddServerRequest {
  name: string;
  displayName?: string;
  description?: string;
  transport?: TransportType;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  secretEnvKeys?: string[];
  url?: string;
  iconUrl?: string;
  tags?: string[];
  registryId?: string;
}

export interface UpdateServerRequest {
  displayName?: string;
  description?: string;
  transport?: TransportType;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  secretEnvKeys?: string[];
  url?: string;
  iconUrl?: string;
  enabled?: boolean;
}
