import { useState, useEffect, useMemo, useCallback } from "react";
import {
  RefreshCw,
  Plus,
  Trash2,
  Download,
  Shield,
  AlertTriangle,
  Layers,
  ChevronDown,
  ChevronRight,
  Activity as ActivityIcon,
  Trash,
} from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import * as tauri from "@/lib/tauri";
import type { ActivityEntry } from "@conductor/types";

// ── Icon mapping ────────────────────────────────────────────────────

type ActivityType = "sync" | "add" | "delete" | "import" | "auth" | "error" | "stack";

const typeIcons: Record<
  ActivityType,
  React.ComponentType<{ className?: string }>
> = {
  sync: RefreshCw,
  add: Plus,
  delete: Trash2,
  import: Download,
  auth: Shield,
  error: AlertTriangle,
  stack: Layers,
};

const typeColors: Record<ActivityType, string> = {
  sync: "text-blue-400 bg-blue-500/10",
  add: "text-success bg-success/10",
  delete: "text-error bg-error/10",
  import: "text-accent bg-accent/10",
  auth: "text-warning bg-warning/10",
  error: "text-error bg-error/10",
  stack: "text-purple-400 bg-purple-500/10",
};

// ── Day grouping ────────────────────────────────────────────────────

function groupByDay(entries: ActivityEntry[]): Map<string, ActivityEntry[]> {
  const groups = new Map<string, ActivityEntry[]>();
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now.getTime() - 86400000).toDateString();

  entries.forEach((entry) => {
    const date = new Date(entry.timestamp);
    const dateStr = date.toDateString();
    let label: string;

    if (dateStr === today) label = "Today";
    else if (dateStr === yesterday) label = "Yesterday";
    else label = date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(entry);
  });

  return groups;
}

// ── Activity Entry Component ────────────────────────────────────────

function ActivityEntryRow({ entry }: { entry: ActivityEntry }) {
  const [expanded, setExpanded] = useState(false);
  const entryType = entry.type as ActivityType;
  const Icon = typeIcons[entryType] || AlertTriangle;
  const colorClass = typeColors[entryType] || "text-text-muted bg-surface-3";

  return (
    <div className="group">
      <button
        onClick={() => entry.details && setExpanded(!expanded)}
        className={cn(
          "flex items-start gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors",
          entry.details ? "hover:bg-surface-3 cursor-pointer" : "cursor-default"
        )}
      >
        <div
          className={cn(
            "flex items-center justify-center w-7 h-7 rounded-lg shrink-0 mt-0.5",
            colorClass
          )}
        >
          <Icon className="w-3.5 h-3.5" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-primary">{entry.description}</p>
          <span className="text-[11px] text-text-muted">
            {formatRelativeTime(entry.timestamp)}
          </span>
        </div>

        {entry.details && (
          <div className="shrink-0 mt-1">
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-text-muted" />
            ) : (
              <ChevronRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
        )}
      </button>

      {expanded && entry.details && (
        <div className="ml-10 mr-3 mb-2 px-3 py-2 rounded-lg bg-surface-3 border border-border">
          <p className="text-xs text-text-secondary whitespace-pre-wrap">
            {entry.details}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main Activity View ──────────────────────────────────────────────

export function ActivityView() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);

  const fetchActivity = useCallback(async () => {
    try {
      const data = await tauri.getActivity();
      setEntries(data);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  const clearEntries = useCallback(async () => {
    try {
      await tauri.clearActivity();
      setEntries([]);
    } catch {
      // silently fail
    }
  }, []);

  const grouped = useMemo(() => {
    const sorted = [...entries].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return groupByDay(sorted);
  }, [entries]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="shrink-0 px-6 py-5 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Activity</h1>
            <p className="text-sm text-text-muted mt-0.5">
              {entries.length} event{entries.length !== 1 && "s"} logged
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchActivity}
              className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border text-sm
                text-text-secondary hover:bg-surface-3 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            {entries.length > 0 && (
              <button
                onClick={clearEntries}
                className="flex items-center gap-2 h-9 px-4 rounded-lg border border-border text-sm font-medium
                  text-text-secondary hover:bg-surface-3 transition-colors"
              >
                <Trash className="w-4 h-4" />
                Clear history
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Activity list */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-surface-3 flex items-center justify-center mb-6">
              <ActivityIcon className="w-10 h-10 text-text-muted" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              No activity yet
            </h3>
            <p className="text-sm text-text-muted text-center max-w-[320px]">
              Actions like adding servers, syncing to clients, and importing
              configurations will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(grouped.entries()).map(([dayLabel, dayEntries]) => (
              <div key={dayLabel}>
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 px-3">
                  {dayLabel}
                </h3>
                <div className="space-y-0.5">
                  {dayEntries.map((entry) => (
                    <ActivityEntryRow key={entry.id} entry={entry} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
