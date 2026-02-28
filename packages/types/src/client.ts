export type SupportedClient =
  | "claude-desktop"
  | "cursor"
  | "vscode"
  | "claude-code"
  | "windsurf"
  | "zed"
  | "jetbrains"
  | "codex";

export interface ClientDetection {
  clientId: string;
  displayName: string;
  icon: string;
  detected: boolean;
  configPath?: string;
  serverCount: number;
  serverNames: string[];
  lastSyncedAt?: string;
  configUpdatedAt?: string;
}

export interface ClientSync {
  clientId: string;
  enabled: boolean;
  lastSyncedAt?: string;
  configPath: string;
  serverIds: string[];
}
