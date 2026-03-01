import { useState, useCallback } from "react";
import {
  RefreshCw,
  Download,
  Upload,
  Monitor,
  CheckCircle2,
  AlertCircle,
  XCircle,
  MinusCircle,
  Loader2,
} from "lucide-react";
import { cn, formatRelativeTime, truncatePath } from "@/lib/utils";
import { useClientStore } from "@/stores/clientStore";
import { useConfigStore } from "@/stores/configStore";
import { useSyncStore } from "@/stores/syncStore";
import { ClientLogo } from "@/components/ClientLogo";
import { toast } from "sonner";
import type { ClientDetection } from "@conductor/types";

// ── Status Dot ──────────────────────────────────────────────────────

type SyncStatus = "synced" | "out-of-sync" | "not-installed" | "error";

function getSyncStatus(client: ClientDetection): SyncStatus {
  if (!client.detected) return "not-installed";
  if (!client.lastSyncedAt) return "out-of-sync";
  if (client.configUpdatedAt && client.configUpdatedAt > client.lastSyncedAt) return "out-of-sync";

  const expectedNames = new Set(client.expectedServerNames);
  const clientNames = new Set(client.serverNames);

  // Check if any expected Conductor server is missing from the client's config
  const hasMissing = client.expectedServerNames.some(
    (name) => !clientNames.has(name)
  );
  if (hasMissing) return "out-of-sync";

  // Check for orphans: servers Conductor previously synced that are
  // still in the client but no longer expected (i.e. deleted from Conductor)
  if (client.previouslySyncedNames && client.previouslySyncedNames.length > 0) {
    const hasOrphan = client.previouslySyncedNames.some(
      (name) => clientNames.has(name) && !expectedNames.has(name)
    );
    if (hasOrphan) return "out-of-sync";
  }

  return "synced";
}

function StatusDot({ status }: { status: SyncStatus }) {
  return (
    <span className="relative flex items-center">
      <span
        className={cn(
          "w-2 h-2 rounded-full",
          status === "synced" && "bg-success",
          status === "out-of-sync" && "bg-warning",
          status === "not-installed" && "bg-text-muted",
          status === "error" && "bg-error"
        )}
      />
      {status === "synced" && (
        <span className="absolute w-2 h-2 rounded-full bg-success animate-ping opacity-40" />
      )}
    </span>
  );
}

function StatusLabel({ status }: { status: SyncStatus }) {
  const labels: Record<SyncStatus, { text: string; color: string; icon: typeof CheckCircle2 }> = {
    synced: { text: "Synced", color: "text-success", icon: CheckCircle2 },
    "out-of-sync": { text: "Out of sync", color: "text-warning", icon: AlertCircle },
    "not-installed": { text: "Not installed", color: "text-text-muted", icon: MinusCircle },
    error: { text: "Error", color: "text-error", icon: XCircle },
  };

  const { text, color, icon: Icon } = labels[status];

  return (
    <div className={cn("flex items-center gap-1.5 text-xs font-medium", color)}>
      <Icon className="w-3.5 h-3.5" />
      {text}
    </div>
  );
}

// ── Client Card ─────────────────────────────────────────────────────

function ClientCard({ client }: { client: ClientDetection }) {
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [flashGreen, setFlashGreen] = useState(false);

  const syncToClient = useClientStore((s) => s.syncToClient);
  const importFromClient = useClientStore((s) => s.importFromClient);
  const fetchServers = useConfigStore((s) => s.fetchServers);
  const startSync = useSyncStore((s) => s.startSync);
  const completeSync = useSyncStore((s) => s.completeSync);

  const status = getSyncStatus(client);

  const handleSync = useCallback(async () => {
    if (!client.detected) return;
    setSyncing(true);
    startSync(client.clientId);

    const result = await syncToClient(client.clientId);
    if (result) {
      completeSync(result);
      if (result.success) {
        setFlashGreen(true);
        setTimeout(() => setFlashGreen(false), 1500);

        // Show warnings if any (e.g., OAuth refresh failed for a server)
        if (result.warnings && result.warnings.length > 0) {
          toast.warning(`Synced ${client.displayName} with warnings`, {
            description: result.warnings.join("; "),
          });
        }
      }
    }
    setSyncing(false);
  }, [client, syncToClient, startSync, completeSync]);

  const handleImport = useCallback(async () => {
    if (!client.detected) return;
    setImporting(true);
    const result = await importFromClient(client.clientId);
    if (result) {
      await fetchServers();
    }
    setImporting(false);
  }, [client, importFromClient, fetchServers]);

  return (
    <div
      className={cn(
        "relative flex flex-col p-4 rounded-xl border transition-all",
        flashGreen
          ? "border-success/50 bg-success/5"
          : "border-border bg-surface-2 hover:border-text-muted/30"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3.5 mb-3">
        <ClientLogo clientId={client.clientId} displayName={client.displayName} size={52} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text-primary">
              {client.displayName}
            </span>
            <StatusDot status={status} />
          </div>
          <StatusLabel status={status} />
        </div>
      </div>

      {/* Config path */}
      {client.configPath && (
        <p className="text-[11px] text-text-muted font-mono mb-3 truncate" title={client.configPath}>
          {truncatePath(client.configPath)}
        </p>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 mb-3 text-xs text-text-muted">
        <span>{client.serverCount} servers</span>
        {client.lastSyncedAt && (
          <span>Last sync: {formatRelativeTime(client.lastSyncedAt)}</span>
        )}

      </div>

      {/* Server chips */}
      {client.serverNames && client.serverNames.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {client.serverNames.slice(0, 5).map((name, i) => (
            <span
              key={i}
              className="inline-flex h-5 px-2 rounded bg-surface-3 text-[10px] text-text-muted font-medium"
            >
              {name}
            </span>
          ))}
          {client.serverNames.length > 5 && (
            <span className="inline-flex h-5 px-2 rounded bg-surface-3 text-[10px] text-text-muted font-medium">
              +{client.serverNames.length - 5} more
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-auto">
        <button
          onClick={handleImport}
          disabled={!client.detected || importing}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-medium transition-colors",
            client.detected
              ? "border border-border text-text-secondary hover:bg-surface-3"
              : "border border-border/50 text-text-muted cursor-not-allowed"
          )}
        >
          {importing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          Import
        </button>
        <button
          onClick={handleSync}
          disabled={!client.detected || syncing}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-medium transition-colors",
            client.detected
              ? "bg-accent text-white hover:bg-accent/90"
              : "bg-surface-3 text-text-muted cursor-not-allowed"
          )}
        >
          {syncing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          Sync
        </button>
      </div>
    </div>
  );
}

// ── Main Clients View ───────────────────────────────────────────────

export function ClientsView() {
  const clients = useClientStore((s) => s.clients);
  const loading = useClientStore((s) => s.loading);
  const detectClients = useClientStore((s) => s.detectClients);
  const syncToAllClients = useClientStore((s) => s.syncToAllClients);
  const [syncingAll, setSyncingAll] = useState(false);

  const detectedCount = clients.filter((c) => c.detected).length;

  const handleSyncAll = async () => {
    setSyncingAll(true);
    await syncToAllClients();
    setSyncingAll(false);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="shrink-0 px-6 py-5 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-text-primary">AI Clients</h1>
            <p className="text-sm text-text-muted mt-0.5">
              {detectedCount} of {clients.length} clients detected
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={detectClients}
              className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border text-sm
                text-text-secondary hover:bg-surface-3 transition-colors"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
            <button
              onClick={handleSyncAll}
              disabled={syncingAll || detectedCount === 0}
              className={cn(
                "flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium transition-colors",
                detectedCount > 0
                  ? "bg-accent text-white hover:bg-accent/90"
                  : "bg-surface-3 text-text-muted cursor-not-allowed"
              )}
            >
              {syncingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Sync All
            </button>
          </div>
        </div>
      </div>

      {/* Client grid */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading && clients.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-[200px] rounded-xl border border-border bg-surface-2 animate-pulse"
              />
            ))}
          </div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-surface-3 flex items-center justify-center mb-6">
              <Monitor className="w-10 h-10 text-text-muted" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              No AI clients detected
            </h3>
            <p className="text-sm text-text-muted text-center max-w-[320px]">
              Install an AI client like Claude Desktop, Cursor, or VS Code to
              get started with server syncing.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clients.map((client) => (
              <ClientCard key={client.clientId} client={client} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
