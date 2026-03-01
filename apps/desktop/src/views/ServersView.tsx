import { useState, useCallback, useEffect } from "react";
import {
  Plus,
  Download,
  MoreHorizontal,
  Pencil,
  Trash2,
  RefreshCw,
  Copy,
  ExternalLink,
  X,
  Server as ServerIcon,
  KeyRound,
  ShieldCheck,
  ShieldX,
  Loader2,
} from "lucide-react";
import { listen } from "@tauri-apps/api/event";
import { cn, formatRelativeTime } from "@/lib/utils";
import { useConfigStore } from "@/stores/configStore";
import { useClientStore } from "@/stores/clientStore";
import { useUIStore } from "@/stores/uiStore";
import { ServerLogo } from "@/components/ServerLogo";
import { AddServerModal } from "@/components/AddServerModal";
import * as tauri from "@/lib/tauri";
import { toast } from "sonner";
import type { McpServer, TransportType, OAuthStatus } from "@conductor/types";

// ── Transport Badge ─────────────────────────────────────────────────

function TransportBadge({ transport }: { transport: TransportType }) {
  const styles: Record<TransportType, string> = {
    stdio: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    sse: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    streamableHttp: "bg-green-500/10 text-green-400 border-green-500/20",
  };

  const labels: Record<TransportType, string> = {
    stdio: "stdio",
    sse: "sse",
    streamableHttp: "http",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold uppercase tracking-wider border",
        styles[transport] || "bg-gray-500/10 text-gray-400 border-gray-500/20"
      )}
    >
      {labels[transport] || transport}
    </span>
  );
}

// ── Toggle Switch ───────────────────────────────────────────────────

function ToggleSwitch({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onChange(!enabled);
      }}
      className={cn(
        "relative w-9 h-[22px] rounded-full transition-colors shrink-0",
        enabled ? "bg-success" : "bg-surface-3 border border-border"
      )}
    >
      <div
        className={cn(
          "absolute top-[3px] w-4 h-4 rounded-full bg-white transition-transform shadow-sm",
          enabled ? "translate-x-[18px]" : "translate-x-[3px]"
        )}
      />
    </button>
  );
}

// ── Server Card ─────────────────────────────────────────────────────

function ServerCard({
  server,
  onClick,
}: {
  server: McpServer;
  onClick: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleServer = useConfigStore((s) => s.toggleServer);
  const deleteServer = useConfigStore((s) => s.deleteServer);
  const clients = useClientStore((s) => s.clients);

  const syncedClientCount = clients.filter((c) => c.detected).length;
  const commandDisplay = server.command
    ? `${server.command} ${server.args?.join(" ") || ""}`
    : server.url || "";

  return (
    <div
      onClick={onClick}
      className={cn(
        "group flex items-center gap-4 h-[56px] px-4 rounded-xl border transition-all cursor-pointer",
        server.enabled
          ? "border-border bg-surface-2 hover:border-text-muted/30 hover:bg-surface-3/50"
          : "border-border/50 bg-surface-2/50 opacity-60 hover:opacity-80"
      )}
    >
      <ServerLogo
        name={server.name}
        command={server.command}
        url={server.url}
        iconUrl={server.iconUrl}
        size={36}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text-primary truncate">
            {server.displayName || server.name}
          </span>
          <TransportBadge transport={server.transport} />
        </div>
        <p className="text-xs text-text-muted font-mono truncate max-w-[300px]">
          {commandDisplay}
        </p>
      </div>

      <span className="text-[11px] text-text-muted shrink-0 hidden md:block">
        {syncedClientCount > 0 && `Synced to ${syncedClientCount} clients`}
      </span>

      {/* Three-dot menu */}
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          className="p-1.5 rounded-lg hover:bg-surface-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
              }}
            />
            <div className="absolute right-0 top-8 z-50 w-44 rounded-lg border border-border bg-surface-2 shadow-xl py-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onClick();
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-text-secondary hover:bg-surface-3 hover:text-text-primary"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  navigator.clipboard.writeText(JSON.stringify(server, null, 2));
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-text-secondary hover:bg-surface-3 hover:text-text-primary"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy JSON
              </button>
              <div className="my-1 h-px bg-border" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  deleteServer(server.id);
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-error hover:bg-error/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          </>
        )}
      </div>

      <ToggleSwitch
        enabled={server.enabled}
        onChange={(v) => toggleServer(server.id, v)}
      />
    </div>
  );
}

// ── OAuth Helpers ───────────────────────────────────────────────────

const KNOWN_PROVIDERS: { pattern: RegExp; provider: string }[] = [
  { pattern: /linear/i, provider: "linear" },
  { pattern: /github/i, provider: "github" },
  { pattern: /google/i, provider: "google" },
  { pattern: /notion/i, provider: "notion" },
  { pattern: /slack/i, provider: "slack" },
  { pattern: /supabase/i, provider: "supabase" },
];

function detectProvider(server: McpServer): string | null {
  const haystack = [server.name, server.displayName, server.url]
    .filter(Boolean)
    .join(" ");
  for (const { pattern, provider } of KNOWN_PROVIDERS) {
    if (pattern.test(haystack)) return provider;
  }
  // Fall back to the server URL's hostname if available
  if (server.url) {
    try {
      return new URL(server.url).hostname;
    } catch {
      // ignore
    }
  }
  return null;
}

// ── Server Detail Panel ─────────────────────────────────────────────

function ServerDetailPanel({
  server,
  onClose,
}: {
  server: McpServer;
  onClose: () => void;
}) {
  const updateServer = useConfigStore((s) => s.updateServer);
  const deleteServer = useConfigStore((s) => s.deleteServer);
  const [isEditing, setIsEditing] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState(
    server.displayName || ""
  );
  const [editDescription, setEditDescription] = useState(
    server.description || ""
  );

  // ── OAuth state ──────────────────────────────────────────────
  const isUrlServer = server.transport === "sse" || server.transport === "streamableHttp";
  const [authStatus, setAuthStatus] = useState<OAuthStatus | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(false);

  const refreshAuthStatus = useCallback(async () => {
    if (!isUrlServer) return;
    setAuthChecking(true);
    try {
      const status = await tauri.checkAuthStatus(server.id);
      setAuthStatus(status);
    } catch (e) {
      console.warn("Auth status check failed:", e);
    }
    setAuthChecking(false);
  }, [server.id, isUrlServer]);

  // Check auth status on mount
  useEffect(() => {
    refreshAuthStatus();
  }, [refreshAuthStatus]);

  // Listen for OAuth callback to auto-refresh status
  useEffect(() => {
    if (!isUrlServer) return;
    const unlisten = listen<{ serverId: string; provider: string; success: boolean }>(
      "oauth-callback-received",
      (event) => {
        if (event.payload.serverId === server.id && event.payload.success) {
          refreshAuthStatus();
        }
      }
    );
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [server.id, isUrlServer, refreshAuthStatus]);

  const handleAuthorize = useCallback(async () => {
    const provider = detectProvider(server);
    if (!provider) {
      toast.error("Cannot detect OAuth provider", {
        description: "Set OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET in environment variables first.",
      });
      return;
    }
    setAuthLoading(true);
    try {
      await tauri.startOAuthFlow(server.id, provider);
      toast.info("Authorization started", {
        description: "Complete the sign-in in your browser, then return here.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Authorization failed", { description: message });
    }
    setAuthLoading(false);
  }, [server]);

  const handleRevoke = useCallback(async () => {
    try {
      await tauri.revokeAuth(server.id);
      setAuthStatus((prev) => prev ? { ...prev, authenticated: false, provider: undefined, expiresAt: undefined } : null);
      toast.success("Credentials revoked");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Revoke failed", { description: message });
    }
  }, [server.id]);

  const handleSave = async () => {
    await updateServer(server.id, {
      displayName: editDisplayName || undefined,
      description: editDescription || undefined,
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    await deleteServer(server.id);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[70] bg-black/40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 bottom-0 z-[71] w-[480px] bg-surface-1 border-l border-border shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-surface-1 border-b border-border">
          <div className="h-8" /> {/* Drag region space */}
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <ServerLogo
                name={server.name}
                command={server.command}
                url={server.url}
                iconUrl={server.iconUrl}
                size={48}
              />
              <div>
                <h3 className="text-base font-semibold text-text-primary">
                  {server.displayName || server.name}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <TransportBadge transport={server.transport} />
                  <span
                    className={cn(
                      "text-[11px] font-medium",
                      server.enabled ? "text-success" : "text-text-muted"
                    )}
                  >
                    {server.enabled ? "Active" : "Disabled"}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-surface-3 text-text-muted"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* General info */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                General
              </h4>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-accent hover:text-accent/80"
                >
                  Edit
                </button>
              )}
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-text-muted">Name</label>
                <p className="text-sm text-text-primary font-mono">
                  {server.name}
                </p>
              </div>
              {(isEditing || server.displayName) && (
                <div>
                  <label className="text-[11px] text-text-muted">
                    Display Name
                  </label>
                  {isEditing ? (
                    <input
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      placeholder="Optional display name"
                      className="w-full h-8 px-2 mt-0.5 rounded bg-surface-3 border border-border text-sm text-text-primary
                        placeholder:text-text-muted outline-none focus:ring-1 focus:ring-accent/50"
                    />
                  ) : (
                    <p className="text-sm text-text-primary">
                      {server.displayName}
                    </p>
                  )}
                </div>
              )}
              {(isEditing || server.description) && (
                <div>
                  <label className="text-[11px] text-text-muted">
                    Description
                  </label>
                  {isEditing ? (
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={2}
                      placeholder="Optional description"
                      className="w-full px-2 py-1.5 mt-0.5 rounded bg-surface-3 border border-border text-sm text-text-primary
                        placeholder:text-text-muted outline-none focus:ring-1 focus:ring-accent/50 resize-none"
                    />
                  ) : (
                    <p className="text-sm text-text-secondary">
                      {server.description}
                    </p>
                  )}
                </div>
              )}
              {isEditing && (
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className="h-8 px-4 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/90"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="h-8 px-4 rounded-lg bg-surface-3 text-text-secondary text-xs font-medium hover:bg-surface-3/80"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Connection details */}
          <section>
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
              Connection
            </h4>
            <div className="space-y-3">
              {server.command && (
                <div>
                  <label className="text-[11px] text-text-muted">Command</label>
                  <p className="text-sm text-text-primary font-mono bg-surface-3 px-3 py-2 rounded-lg">
                    {server.command} {server.args?.join(" ") || ""}
                  </p>
                </div>
              )}
              {server.url && (
                <div>
                  <label className="text-[11px] text-text-muted">URL</label>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-text-primary font-mono bg-surface-3 px-3 py-2 rounded-lg flex-1 truncate">
                      {server.url}
                    </p>
                    <a
                      href={server.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg hover:bg-surface-3 text-text-muted"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )}
              {server.env && Object.keys(server.env).length > 0 && (
                <div>
                  <label className="text-[11px] text-text-muted">
                    Environment Variables
                  </label>
                  <div className="space-y-1 mt-1">
                    {Object.keys(server.env).map((key) => (
                      <div
                        key={key}
                        className="flex items-center gap-2 text-sm font-mono bg-surface-3 px-3 py-1.5 rounded overflow-hidden"
                      >
                        <span className="text-accent shrink-0">{key}</span>
                        <span className="text-text-muted shrink-0">=</span>
                        <span className="text-text-muted truncate min-w-0">
                          {server.secretEnvKeys?.includes(key)
                            ? "********"
                            : server.env![key]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Authentication — only for URL-based servers */}
          {isUrlServer && (
            <section>
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                Authentication
              </h4>
              <div className="space-y-3">
                {/* Status indicator */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-3">
                  {authChecking ? (
                    <Loader2 className="w-5 h-5 text-text-muted animate-spin shrink-0" />
                  ) : authStatus?.authenticated ? (
                    <ShieldCheck className="w-5 h-5 text-success shrink-0" />
                  ) : (
                    <ShieldX className="w-5 h-5 text-text-muted shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">
                      {authChecking
                        ? "Checking..."
                        : authStatus?.authenticated
                          ? "Authenticated"
                          : "Not authenticated"}
                    </p>
                    {authStatus?.authenticated && authStatus.provider && (
                      <p className="text-[11px] text-text-muted">
                        Provider: {authStatus.provider}
                        {authStatus.expiresAt && (
                          <> · Expires {formatRelativeTime(authStatus.expiresAt)}</>
                        )}
                      </p>
                    )}
                    {!authStatus?.authenticated && (
                      <p className="text-[11px] text-text-muted">
                        Authorize to sync OAuth tokens to all clients
                      </p>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  {!authStatus?.authenticated ? (
                    <button
                      onClick={handleAuthorize}
                      disabled={authLoading}
                      className={cn(
                        "flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-medium transition-colors",
                        authLoading
                          ? "bg-accent/60 text-white/60 cursor-wait"
                          : "bg-accent text-white hover:bg-accent/90"
                      )}
                    >
                      {authLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <KeyRound className="w-4 h-4" />
                      )}
                      {authLoading ? "Authorizing..." : "Authorize"}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleAuthorize}
                        disabled={authLoading}
                        className="flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border text-sm font-medium
                          text-text-secondary hover:bg-surface-3 transition-colors"
                      >
                        {authLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                        Re-authorize
                      </button>
                      <button
                        onClick={handleRevoke}
                        className="flex items-center gap-1.5 h-9 px-4 rounded-lg border border-error/30 text-sm font-medium
                          text-error hover:bg-error/10 transition-colors"
                      >
                        <ShieldX className="w-4 h-4" />
                        Revoke
                      </button>
                    </>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Metadata */}
          <section>
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
              Metadata
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {server.createdAt && (
                <div>
                  <label className="text-[11px] text-text-muted">Created</label>
                  <p className="text-sm text-text-secondary">
                    {formatRelativeTime(server.createdAt)}
                  </p>
                </div>
              )}
              {server.updatedAt && (
                <div>
                  <label className="text-[11px] text-text-muted">Updated</label>
                  <p className="text-sm text-text-secondary">
                    {formatRelativeTime(server.updatedAt)}
                  </p>
                </div>
              )}
              <div>
                <label className="text-[11px] text-text-muted">ID</label>
                <p className="text-sm text-text-secondary font-mono truncate">
                  {server.id}
                </p>
              </div>
              {server.registryId && (
                <div>
                  <label className="text-[11px] text-text-muted">
                    Registry
                  </label>
                  <p className="text-sm text-text-secondary font-mono truncate">
                    {server.registryId}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Danger zone */}
          <section>
            <h4 className="text-xs font-semibold text-error uppercase tracking-wider mb-3">
              Danger Zone
            </h4>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 h-9 px-4 rounded-lg border border-error/30 text-error text-sm font-medium
                hover:bg-error/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Server
            </button>
          </section>
        </div>
      </div>
    </>
  );
}

// ── Empty State ─────────────────────────────────────────────────────

function EmptyState() {
  const setAddServerModalOpen = useUIStore((s) => s.setAddServerModalOpen);
  const setActiveView = useUIStore((s) => s.setActiveView);

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-20 h-20 rounded-2xl bg-surface-3 flex items-center justify-center mb-6">
        <ServerIcon className="w-10 h-10 text-text-muted" />
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-2">
        No MCP servers yet
      </h3>
      <p className="text-sm text-text-muted text-center max-w-[320px] mb-6">
        Add a server manually, import from an AI client, or browse the registry
        to get started.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => setActiveView("clients")}
          className="flex items-center gap-2 h-9 px-4 rounded-lg border border-border text-sm font-medium
            text-text-secondary hover:bg-surface-3 transition-colors"
        >
          <Download className="w-4 h-4" />
          Import
        </button>
        <button
          onClick={() => setAddServerModalOpen(true)}
          className="flex items-center gap-2 h-9 px-4 rounded-lg bg-accent text-white text-sm font-medium
            hover:bg-accent/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Server
        </button>
      </div>
    </div>
  );
}

// ── Main Servers View ───────────────────────────────────────────────

export function ServersView() {
  const servers = useConfigStore((s) => s.servers);
  const loading = useConfigStore((s) => s.loading);
  const fetchServers = useConfigStore((s) => s.fetchServers);
  const setAddServerModalOpen = useUIStore((s) => s.setAddServerModalOpen);
  const selectedServerId = useUIStore((s) => s.selectedServerId);
  const setSelectedServerId = useUIStore((s) => s.setSelectedServerId);
  const serverDetailOpen = useUIStore((s) => s.serverDetailOpen);
  const setServerDetailOpen = useUIStore((s) => s.setServerDetailOpen);
  const setActiveView = useUIStore((s) => s.setActiveView);

  const selectedServer = servers.find((s) => s.id === selectedServerId);
  const activeCount = servers.filter((s) => s.enabled).length;

  const openDetail = useCallback(
    (id: string) => {
      setSelectedServerId(id);
      setServerDetailOpen(true);
    },
    [setSelectedServerId, setServerDetailOpen]
  );

  const closeDetail = useCallback(() => {
    setServerDetailOpen(false);
    setSelectedServerId(null);
  }, [setServerDetailOpen, setSelectedServerId]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="shrink-0 px-6 py-5 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-text-primary">
              MCP Servers
            </h1>
            <p className="text-sm text-text-muted mt-0.5">
              {servers.length} server{servers.length !== 1 && "s"},{" "}
              {activeCount} active
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fetchServers()}
              className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border text-sm
                text-text-secondary hover:bg-surface-3 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveView("clients")}
              className="flex items-center gap-2 h-9 px-4 rounded-lg border border-border text-sm font-medium
                text-text-secondary hover:bg-surface-3 transition-colors"
            >
              <Download className="w-4 h-4" />
              Import
            </button>
            <button
              onClick={() => setAddServerModalOpen(true)}
              className="flex items-center gap-2 h-9 px-4 rounded-lg bg-accent text-white text-sm font-medium
                hover:bg-accent/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Server
            </button>
          </div>
        </div>
      </div>

      {/* Server list */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[56px] rounded-xl border border-border bg-surface-2 animate-pulse"
              />
            ))}
          </div>
        ) : servers.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-2">
            {servers.map((server) => (
              <ServerCard
                key={server.id}
                server={server}
                onClick={() => openDetail(server.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {serverDetailOpen && selectedServer && (
        <ServerDetailPanel server={selectedServer} onClose={closeDetail} />
      )}

      {/* Add server modal */}
      <AddServerModal />
    </div>
  );
}
