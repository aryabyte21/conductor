import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Search,
  Server,
  Monitor,
  Layers,
  Activity,
  Settings,
  Plus,
  RefreshCw,
  Download,
  ArrowRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useConfigStore } from "@/stores/configStore";
import { useClientStore } from "@/stores/clientStore";
import { useUIStore, type ActiveView } from "@/stores/uiStore";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  group: "servers" | "actions" | "navigation";
  action: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const servers = useConfigStore((s) => s.servers);
  const clients = useClientStore((s) => s.clients);
  const setActiveView = useUIStore((s) => s.setActiveView);
  const setAddServerModalOpen = useUIStore((s) => s.setAddServerModalOpen);
  const setSelectedServerId = useUIStore((s) => s.setSelectedServerId);
  const setServerDetailOpen = useUIStore((s) => s.setServerDetailOpen);
  const syncToAllClients = useClientStore((s) => s.syncToAllClients);

  const close = useCallback(() => {
    onOpenChange(false);
    setQuery("");
    setSelectedIndex(0);
  }, [onOpenChange]);

  const items = useMemo<CommandItem[]>(() => {
    const result: CommandItem[] = [];

    // Server items
    servers.forEach((server) => {
      result.push({
        id: `server-${server.id}`,
        label: server.displayName || server.name,
        description: server.command || server.url || "",
        icon: Server,
        group: "servers",
        action: () => {
          setSelectedServerId(server.id);
          setServerDetailOpen(true);
          setActiveView("servers");
          close();
        },
      });
    });

    // Action items
    result.push({
      id: "action-add-server",
      label: "Add Server",
      description: "Add a new MCP server",
      icon: Plus,
      group: "actions",
      action: () => {
        setActiveView("servers");
        setAddServerModalOpen(true);
        close();
      },
    });

    result.push({
      id: "action-sync-all",
      label: "Sync All Clients",
      description: "Push config to all detected clients",
      icon: RefreshCw,
      group: "actions",
      action: () => {
        syncToAllClients();
        close();
      },
    });

    clients
      .filter((c) => c.detected)
      .forEach((client) => {
        result.push({
          id: `action-import-${client.clientId}`,
          label: `Import from ${client.displayName}`,
          description: `Import servers from ${client.displayName}`,
          icon: Download,
          group: "actions",
          action: () => {
            setActiveView("clients");
            close();
          },
        });
      });

    // Navigation items
    const navItems: { id: ActiveView; label: string; icon: typeof Server }[] = [
      { id: "servers", label: "Go to Servers", icon: Server },
      { id: "clients", label: "Go to Clients", icon: Monitor },
      { id: "stacks", label: "Go to Stacks", icon: Layers },
      { id: "registry", label: "Go to Registry", icon: Search },
      { id: "activity", label: "Go to Activity", icon: Activity },
      { id: "settings", label: "Go to Settings", icon: Settings },
    ];

    navItems.forEach((nav) => {
      result.push({
        id: `nav-${nav.id}`,
        label: nav.label,
        icon: nav.icon,
        group: "navigation",
        action: () => {
          setActiveView(nav.id);
          close();
        },
      });
    });

    return result;
  }, [
    servers,
    clients,
    setActiveView,
    setAddServerModalOpen,
    setSelectedServerId,
    setServerDetailOpen,
    syncToAllClients,
    close,
  ]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;

    const lower = query.toLowerCase();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(lower) ||
        item.description?.toLowerCase().includes(lower)
    );
  }, [items, query]);

  const grouped = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    filtered.forEach((item) => {
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push(item);
    });
    return groups;
  }, [filtered]);

  const flatFiltered = useMemo(() => {
    const order = ["servers", "actions", "navigation"];
    const result: CommandItem[] = [];
    order.forEach((group) => {
      if (grouped[group]) result.push(...grouped[group]);
    });
    return result;
  }, [grouped]);

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.querySelector("[data-selected='true']");
    if (selected) {
      selected.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flatFiltered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (flatFiltered[selectedIndex]) {
          flatFiltered[selectedIndex].action();
        }
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
    }
  };

  if (!open) return null;

  const groupLabels: Record<string, string> = {
    servers: "Servers",
    actions: "Actions",
    navigation: "Navigation",
  };

  let globalIdx = -1;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
        onClick={close}
      />

      {/* Palette */}
      <div
        className="fixed top-[15%] left-1/2 -translate-x-1/2 z-[101] w-full max-w-[520px]
          rounded-xl border border-border bg-surface-2 shadow-2xl overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 border-b border-border">
          <Search className="w-4 h-4 text-text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search servers, actions, and more..."
            className="flex-1 h-12 bg-transparent text-text-primary text-sm placeholder:text-text-muted
              outline-none border-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            onClick={close}
            className="p-1 rounded hover:bg-surface-3 text-text-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[360px] overflow-y-auto py-2">
          {flatFiltered.length === 0 ? (
            <div className="px-4 py-8 text-center text-text-muted text-sm">
              No results found for "{query}"
            </div>
          ) : (
            ["servers", "actions", "navigation"].map((group) => {
              if (!grouped[group] || grouped[group].length === 0) return null;

              return (
                <div key={group}>
                  <div className="px-4 py-1.5">
                    <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                      {groupLabels[group]}
                    </span>
                  </div>
                  {grouped[group].map((item) => {
                    globalIdx++;
                    const isSelected = globalIdx === selectedIndex;
                    const Icon = item.icon;
                    const currentIdx = globalIdx;

                    return (
                      <button
                        key={item.id}
                        data-selected={isSelected}
                        className={cn(
                          "flex items-center gap-3 w-full px-4 py-2 text-left transition-colors",
                          isSelected
                            ? "bg-accent/10 text-text-primary"
                            : "text-text-secondary hover:bg-surface-3"
                        )}
                        onClick={item.action}
                        onMouseEnter={() => setSelectedIndex(currentIdx)}
                      >
                        <Icon
                          className={cn(
                            "w-4 h-4 shrink-0",
                            isSelected ? "text-accent" : "text-text-muted"
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium truncate block">
                            {item.label}
                          </span>
                          {item.description && (
                            <span className="text-xs text-text-muted truncate block">
                              {item.description}
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <ArrowRight className="w-3.5 h-3.5 text-accent shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border">
          <div className="flex items-center gap-3 text-[11px] text-text-muted">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-surface-3 text-[10px] font-mono">
                &uarr;&darr;
              </kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-surface-3 text-[10px] font-mono">
                &crarr;
              </kbd>
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-surface-3 text-[10px] font-mono">
                esc
              </kbd>
              Close
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
