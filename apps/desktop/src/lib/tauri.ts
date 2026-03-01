import { invoke } from "@tauri-apps/api/core";
import type {
  McpServer,
  McpConfig,
  AddServerRequest,
  UpdateServerRequest,
  ClientDetection,
  SyncResult,
  ImportResult,
  RegistryServer,
  McpStack,
  OAuthStatus,
  ActivityEntry,
  AppSettings,
} from "@conductor/types";

// ── Server management ───────────────────────────────────────────────

export async function addServer(request: AddServerRequest): Promise<McpServer> {
  return invoke<McpServer>("add_server", { request });
}

export async function updateServer(
  serverId: string,
  request: UpdateServerRequest
): Promise<McpServer> {
  return invoke<McpServer>("update_server", { serverId, request });
}

export async function deleteServer(serverId: string): Promise<void> {
  return invoke<void>("delete_server", { serverId });
}

export async function toggleServer(
  serverId: string,
  enabled: boolean
): Promise<McpServer> {
  return invoke<McpServer>("toggle_server", { serverId, enabled });
}

// ── Config management ───────────────────────────────────────────────

export async function readMasterConfig(): Promise<McpConfig> {
  return invoke<McpConfig>("read_master_config");
}

export async function saveMasterConfig(config: McpConfig): Promise<void> {
  return invoke<void>("save_master_config", { config });
}

export async function getAppVersion(): Promise<string> {
  return invoke<string>("get_app_version");
}

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  downloadUrl: string;
  releaseNotes: string;
  publishedAt: string;
  updateAvailable: boolean;
}

export async function checkForUpdates(): Promise<UpdateInfo> {
  return invoke<UpdateInfo>("check_for_updates");
}

// ── Client detection & sync ─────────────────────────────────────────

export async function detectClients(): Promise<ClientDetection[]> {
  return invoke<ClientDetection[]>("detect_clients");
}

export async function importFromClient(
  clientId: string
): Promise<ImportResult> {
  return invoke<ImportResult>("import_from_client", { clientId });
}

export async function syncToClient(
  clientId: string,
  serverIds?: string[]
): Promise<SyncResult> {
  return invoke<SyncResult>("sync_to_client", { clientId, serverIds });
}

export async function syncToAllClients(): Promise<SyncResult[]> {
  return invoke<SyncResult[]>("sync_to_all_clients");
}

// ── Secrets ─────────────────────────────────────────────────────────

export async function saveSecret(
  serverId: string,
  key: string,
  value: string
): Promise<void> {
  return invoke<void>("save_secret", { serverId, key, value });
}

export async function getSecret(
  serverId: string,
  key: string
): Promise<string | null> {
  return invoke<string | null>("get_secret", { serverId, key });
}

export async function deleteSecret(
  serverId: string,
  key: string
): Promise<void> {
  return invoke<void>("delete_secret", { serverId, key });
}

export async function listSecretKeys(serverId: string): Promise<string[]> {
  return invoke<string[]>("list_secret_keys", { serverId });
}

// ── Registry ────────────────────────────────────────────────────────

export async function getPopularServers(): Promise<RegistryServer[]> {
  return invoke<RegistryServer[]>("get_popular_servers");
}

export async function searchRegistry(
  query: string
): Promise<RegistryServer[]> {
  return invoke<RegistryServer[]>("search_registry", { query });
}

export async function installFromRegistry(
  registryId: string
): Promise<McpServer> {
  return invoke<McpServer>("install_from_registry", { registryId });
}

// ── Logo resolution ─────────────────────────────────────────────────

export async function resolveServerLogo(
  name: string,
  command?: string,
  url?: string
): Promise<string | null> {
  return invoke<string | null>("resolve_server_logo", { name, command, url });
}

export async function getClientIcon(
  clientId: string
): Promise<string | null> {
  return invoke<string | null>("get_client_icon", { clientId });
}

// ── OAuth ───────────────────────────────────────────────────────────

export async function startOAuthFlow(
  serverId: string,
  provider: string
): Promise<string> {
  return invoke<string>("start_oauth_flow", { serverId, provider });
}

export async function checkAuthStatus(
  serverId: string
): Promise<OAuthStatus> {
  return invoke<OAuthStatus>("check_auth_status", { serverId });
}

export async function revokeAuth(serverId: string): Promise<void> {
  return invoke<void>("revoke_auth", { serverId });
}

// ── Stacks ──────────────────────────────────────────────────────────

export async function exportStack(
  name: string,
  description: string,
  serverIds: string[],
  tags: string[]
): Promise<string> {
  return invoke<string>("export_stack", { name, description, serverIds, tags });
}

export async function importStack(stackJson: string): Promise<McpStack> {
  return invoke<McpStack>("import_stack", { stackJson });
}

export async function getStackFromUrl(url: string): Promise<McpStack> {
  return invoke<McpStack>("get_stack_from_url", { url });
}

export interface SavedStack {
  id: string;
  json: string;
  createdAt: string;
}

export async function saveExportedStack(stackJson: string): Promise<SavedStack> {
  return invoke<SavedStack>("save_exported_stack", { stackJson });
}

export async function getSavedStacks(): Promise<SavedStack[]> {
  return invoke<SavedStack[]>("get_saved_stacks");
}

export async function deleteSavedStack(stackId: string): Promise<void> {
  return invoke<void>("delete_saved_stack", { stackId });
}

// ── Activity ────────────────────────────────────────────────────────

export async function getActivity(): Promise<ActivityEntry[]> {
  return invoke<ActivityEntry[]>("get_activity");
}

export async function clearActivity(): Promise<void> {
  return invoke<void>("clear_activity");
}

// ── Settings ────────────────────────────────────────────────────────

export async function getSettings(): Promise<AppSettings> {
  return invoke<AppSettings>("get_settings");
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  return invoke<void>("save_settings", { settings });
}

export async function resetSettings(): Promise<AppSettings> {
  return invoke<AppSettings>("reset_settings");
}

// ── System utilities ────────────────────────────────────────────────

export async function openConfigFolder(): Promise<void> {
  return invoke<void>("open_config_folder");
}

export async function exportConfig(): Promise<string> {
  return invoke<string>("export_config");
}
