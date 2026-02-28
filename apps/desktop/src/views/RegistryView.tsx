import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  Download,
  ExternalLink,
  CheckCircle2,
  Loader2,
  PackageSearch,
  BadgeCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import * as tauri from "@/lib/tauri";
import { useConfigStore } from "@/stores/configStore";
import { ServerLogo } from "@/components/ServerLogo";
import type { RegistryServer } from "@conductor/types";
import { toast } from "sonner";

// ── Install Dialog ──────────────────────────────────────────────────

function InstallDialog({
  server,
  onClose,
}: {
  server: RegistryServer;
  onClose: () => void;
}) {
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);
  const fetchServers = useConfigStore((s) => s.fetchServers);

  const handleInstall = async () => {
    setInstalling(true);
    try {
      const installed = await tauri.installFromRegistry(server.id);

      // If user provided env vars, update the server with them
      const nonEmptyEnvVars = Object.fromEntries(
        Object.entries(envVars).filter(([, v]) => v.trim() !== "")
      );
      if (Object.keys(nonEmptyEnvVars).length > 0) {
        const existingEnv = installed.env || {};
        await tauri.updateServer(installed.id, {
          env: { ...existingEnv, ...nonEmptyEnvVars },
          secretEnvKeys: Object.keys(nonEmptyEnvVars),
        });
      }

      setInstalled(true);
      await fetchServers();
      toast.success(`Installed ${server.displayName}`);
      setTimeout(() => onClose(), 1000);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Installation failed", { description: message });
    }
    setInstalling(false);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[91] flex items-center justify-center p-4">
        <div
          className="w-full max-w-[440px] bg-surface-2 border border-border rounded-xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
            <ServerLogo
              name={server.qualifiedName || server.displayName}
              iconUrl={server.iconUrl}
              size={36}
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-text-primary truncate">
                Install {server.displayName}
              </h3>
              <p className="text-xs text-text-muted truncate">
                {server.qualifiedName}
              </p>
            </div>
          </div>

          <div className="px-6 py-4 space-y-4">
            <p className="text-sm text-text-secondary">
              {server.description}
            </p>

            {/* Env var inputs - shown as a hint for now */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Environment Variables (optional)
              </label>
              <p className="text-[11px] text-text-muted mb-2">
                Some servers require API keys or tokens. Add them here.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="KEY"
                  className="flex-1 h-8 px-2 rounded bg-surface-3 border border-border text-sm font-mono text-text-primary
                    placeholder:text-text-muted outline-none focus:ring-1 focus:ring-accent/50"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const input = e.currentTarget;
                      const key = input.value.trim();
                      if (key) {
                        setEnvVars((prev) => ({ ...prev, [key]: "" }));
                        input.value = "";
                      }
                    }
                  }}
                />
              </div>
              {Object.keys(envVars).length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {Object.entries(envVars).map(([key]) => (
                    <div key={key} className="flex gap-2">
                      <span className="h-8 px-2 flex items-center rounded bg-surface-3 border border-border text-xs font-mono text-accent min-w-[100px]">
                        {key}
                      </span>
                      <input
                        type="password"
                        placeholder="value"
                        value={envVars[key]}
                        onChange={(e) =>
                          setEnvVars((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                        className="flex-1 h-8 px-2 rounded bg-surface-3 border border-border text-sm font-mono text-text-primary
                          placeholder:text-text-muted outline-none focus:ring-1 focus:ring-accent/50"
                      />
                      <button
                        onClick={() =>
                          setEnvVars((prev) => {
                            const next = { ...prev };
                            delete next[key];
                            return next;
                          })
                        }
                        className="h-8 px-2 rounded hover:bg-surface-3 text-text-muted text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-border">
            <button
              onClick={onClose}
              className="h-9 px-4 rounded-lg text-sm font-medium text-text-secondary hover:bg-surface-3"
            >
              Cancel
            </button>
            <button
              onClick={handleInstall}
              disabled={installing || installed}
              className={cn(
                "flex items-center gap-1.5 h-9 px-5 rounded-lg text-sm font-medium transition-colors",
                installed
                  ? "bg-success text-white"
                  : installing
                    ? "bg-accent/60 text-white/60 cursor-wait"
                    : "bg-accent text-white hover:bg-accent/90"
              )}
            >
              {installed ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Installed
                </>
              ) : installing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Installing...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Install
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Registry Card ───────────────────────────────────────────────────

function RegistryCard({
  server,
  onInstall,
}: {
  server: RegistryServer;
  onInstall: () => void;
}) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl border border-border bg-surface-2 hover:border-text-muted/30 transition-colors">
      <ServerLogo
        name={server.qualifiedName || server.displayName}
        iconUrl={server.iconUrl}
        size={40}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-semibold text-text-primary truncate">
            {server.displayName}
          </span>
          {server.verified && (
            <BadgeCheck className="w-4 h-4 text-accent shrink-0" />
          )}
        </div>
        <p className="text-xs text-text-muted font-mono mb-1.5">
          {server.qualifiedName}
        </p>
        <p className="text-sm text-text-secondary line-clamp-2 mb-3">
          {server.description}
        </p>

        <div className="flex items-center gap-4">
          {(server.useCount ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-xs text-text-muted">
              <Users className="w-3.5 h-3.5" />
              {(server.useCount ?? 0).toLocaleString()} uses
            </span>
          )}
          {server.homepage && (
            <a
              href={server.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-accent hover:text-accent/80"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Homepage
            </a>
          )}
        </div>
      </div>

      <button
        onClick={onInstall}
        className="shrink-0 flex items-center gap-1.5 h-8 px-4 rounded-lg bg-accent text-white text-xs font-medium
          hover:bg-accent/90 transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        Install
      </button>
    </div>
  );
}

// ── Skeleton ────────────────────────────────────────────────────────

function RegistrySkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="flex items-start gap-4 p-4 rounded-xl border border-border bg-surface-2 animate-pulse"
        >
          <div className="w-10 h-10 rounded-full bg-surface-3" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 rounded bg-surface-3" />
            <div className="h-3 w-1/4 rounded bg-surface-3" />
            <div className="h-3 w-2/3 rounded bg-surface-3" />
          </div>
          <div className="h-8 w-20 rounded-lg bg-surface-3" />
        </div>
      ))}
    </div>
  );
}

// ── Main Registry View ──────────────────────────────────────────────

export function RegistryView() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RegistryServer[]>([]);
  const [popular, setPopular] = useState<RegistryServer[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPopular, setLoadingPopular] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const [installTarget, setInstallTarget] = useState<RegistryServer | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Load popular servers on mount
  useEffect(() => {
    tauri.getPopularServers()
      .then(setPopular)
      .catch(() => {})
      .finally(() => setLoadingPopular(false));
  }, []);

  const searchIdRef = useRef(0);

  const doSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const id = ++searchIdRef.current;
    setLoading(true);
    setHasSearched(true);

    try {
      const servers = await tauri.searchRegistry(trimmed);
      // Only update if this is still the latest search
      if (id === searchIdRef.current) {
        setResults(servers);
      }
    } catch (err) {
      if (id === searchIdRef.current) {
        const message = err instanceof Error ? err.message : String(err);
        toast.error("Search failed", { description: message });
        setResults([]);
      }
    }

    if (id === searchIdRef.current) {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="shrink-0 px-6 py-5 border-b border-border">
        <h1 className="text-xl font-bold text-text-primary mb-4">Registry</h1>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-muted" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search MCP servers (e.g. filesystem, github, slack...)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-surface-3 border border-border text-text-primary text-sm
              placeholder:text-text-muted outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50
              transition-shadow"
          />
          {loading && (
            <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted animate-spin" />
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <RegistrySkeleton />
        ) : !hasSearched ? (
          loadingPopular ? (
            <RegistrySkeleton />
          ) : popular.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                Popular MCP Servers
              </p>
              {popular.map((server) => (
                <RegistryCard
                  key={server.id}
                  server={server}
                  onInstall={() => setInstallTarget(server)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-20 h-20 rounded-2xl bg-surface-3 flex items-center justify-center mb-6">
                <PackageSearch className="w-10 h-10 text-text-muted" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                Discover MCP Servers
              </h3>
              <p className="text-sm text-text-muted text-center max-w-[340px]">
                Search the registry to find and install MCP servers. Try searching
                for "filesystem", "github", or "slack".
              </p>
            </div>
          )
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-surface-3 flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-text-muted" />
            </div>
            <h3 className="text-base font-semibold text-text-primary mb-1">
              No results found
            </h3>
            <p className="text-sm text-text-muted">
              No servers match "{query}". Try a different search term.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-text-muted mb-2">
              {results.length} result{results.length !== 1 && "s"}
            </p>
            {results.map((server) => (
              <RegistryCard
                key={server.id}
                server={server}
                onInstall={() => setInstallTarget(server)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Install dialog */}
      {installTarget && (
        <InstallDialog
          server={installTarget}
          onClose={() => setInstallTarget(null)}
        />
      )}
    </div>
  );
}
