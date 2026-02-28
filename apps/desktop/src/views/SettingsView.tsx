import { useState, useEffect, useCallback } from "react";
import {
  Settings2,
  RefreshCw,
  Bell,
  FolderOpen,
  AlertTriangle,
  Trash2,
  FileJson,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import * as tauri from "@/lib/tauri";
import { toast } from "sonner";
import type { AppSettings } from "@conductor/types";

// ── Toggle Component ────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        "relative w-10 h-6 rounded-full transition-colors shrink-0",
        checked ? "bg-accent" : "bg-surface-3 border border-border"
      )}
    >
      <div
        className={cn(
          "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
          checked ? "translate-x-5" : "translate-x-1"
        )}
      />
    </button>
  );
}

// ── Section Component ───────────────────────────────────────────────

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  const Icon = icon;
  return (
    <div className="rounded-xl border border-border bg-surface-2 overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border">
        <Icon className="w-4 h-4 text-text-muted" />
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ── Setting Row ─────────────────────────────────────────────────────

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
      <div className="flex-1 min-w-0 mr-4">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {description && (
          <p className="text-xs text-text-muted mt-0.5">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// ── Danger Confirm Dialog ───────────────────────────────────────────

function DangerConfirmDialog({
  title,
  description,
  confirmWord,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmWord: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [input, setInput] = useState("");
  const canConfirm = input === confirmWord;

  return (
    <>
      <div
        className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="fixed inset-0 z-[91] flex items-center justify-center p-4">
        <div
          className="w-full max-w-[400px] bg-surface-2 border border-border rounded-xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2 text-error">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-semibold">{title}</h3>
            </div>
          </div>
          <div className="px-6 py-4 space-y-4">
            <p className="text-sm text-text-secondary">{description}</p>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">
                Type <span className="font-mono font-bold text-error">{confirmWord}</span> to confirm
              </label>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={confirmWord}
                className="w-full h-9 px-3 rounded-lg bg-surface-3 border border-border text-text-primary text-sm font-mono
                  placeholder:text-text-muted outline-none focus:ring-1 focus:ring-error/50 focus:border-error/50"
                autoFocus
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-border">
            <button
              onClick={onCancel}
              className="h-9 px-4 rounded-lg text-sm font-medium text-text-secondary hover:bg-surface-3"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={!canConfirm}
              className={cn(
                "h-9 px-4 rounded-lg text-sm font-medium transition-colors",
                canConfirm
                  ? "bg-error text-white hover:bg-error/90"
                  : "bg-surface-3 text-text-muted cursor-not-allowed"
              )}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main Settings View ──────────────────────────────────────────────

export function SettingsView() {
  const [settings, setSettings] = useState<AppSettings>({
    launchAtLogin: false,
    startMinimized: false,
    autoSync: true,
    syncDelay: 5,
    notifyExternal: true,
    backupRetention: 30,
    syncNotifications: true,
    errorNotifications: true,
  });
  const [loaded, setLoaded] = useState(false);
  const [dangerDialog, setDangerDialog] = useState<null | "clear" | "reset">(null);

  useEffect(() => {
    tauri.getSettings().then((s) => {
      setSettings(s);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const updateSetting = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      tauri.saveSettings(next).catch(() => {});
      return next;
    });
  }, []);

  const handleOpenConfig = async () => {
    try {
      await tauri.openConfigFolder();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Failed to open config folder", { description: message });
    }
  };

  const handleExportConfig = async () => {
    try {
      const json = await tauri.exportConfig();
      await navigator.clipboard.writeText(json);
      toast.success("Config copied to clipboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Failed to export config", { description: message });
    }
  };

  const handleClearConfigs = async () => {
    try {
      await tauri.saveMasterConfig({
        servers: [],
        sync: [],
      });
      toast.success("All configurations cleared");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Failed to clear configs", { description: message });
    }
    setDangerDialog(null);
  };

  const handleReset = async () => {
    try {
      const defaults = await tauri.resetSettings();
      setSettings(defaults);
      toast.success("Settings reset to defaults");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Failed to reset settings", { description: message });
    }
    setDangerDialog(null);
  };

  if (!loaded) return null;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="shrink-0 px-6 py-5 border-b border-border">
        <h1 className="text-xl font-bold text-text-primary">Settings</h1>
        <p className="text-sm text-text-muted mt-0.5">
          Configure Conductor preferences
        </p>
      </div>

      {/* Settings sections */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {/* General */}
        <Section title="General" icon={Settings2}>
          <div className="divide-y divide-border">
            <SettingRow
              label="Launch at login"
              description="Start Conductor automatically when you log in"
            >
              <Toggle checked={settings.launchAtLogin} onChange={(v) => updateSetting("launchAtLogin", v)} />
            </SettingRow>
            <SettingRow
              label="Start minimized"
              description="Minimize to system tray on launch"
            >
              <Toggle checked={settings.startMinimized} onChange={(v) => updateSetting("startMinimized", v)} />
            </SettingRow>
          </div>
        </Section>

        {/* Sync */}
        <Section title="Sync" icon={RefreshCw}>
          <div className="divide-y divide-border">
            <SettingRow
              label="Auto-sync"
              description="Automatically sync changes to clients"
            >
              <Toggle checked={settings.autoSync} onChange={(v) => updateSetting("autoSync", v)} />
            </SettingRow>
            {settings.autoSync && (
              <SettingRow
                label="Sync delay"
                description="Wait before auto-syncing after changes"
              >
                <select
                  value={String(settings.syncDelay)}
                  onChange={(e) => updateSetting("syncDelay", Number(e.target.value))}
                  className="h-8 px-2 rounded-lg bg-surface-3 border border-border text-sm text-text-primary
                    outline-none focus:ring-1 focus:ring-accent/50"
                >
                  <option value="0">Immediate</option>
                  <option value="2">2 seconds</option>
                  <option value="5">5 seconds</option>
                  <option value="10">10 seconds</option>
                  <option value="30">30 seconds</option>
                </select>
              </SettingRow>
            )}
            <SettingRow
              label="Notify on external changes"
              description="Show a notification when a client config changes externally"
            >
              <Toggle checked={settings.notifyExternal} onChange={(v) => updateSetting("notifyExternal", v)} />
            </SettingRow>
            <SettingRow
              label="Backup retention"
              description="How long to keep config backups"
            >
              <select
                value={String(settings.backupRetention)}
                onChange={(e) => updateSetting("backupRetention", Number(e.target.value))}
                className="h-8 px-2 rounded-lg bg-surface-3 border border-border text-sm text-text-primary
                  outline-none focus:ring-1 focus:ring-accent/50"
              >
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="0">Never delete</option>
              </select>
            </SettingRow>
          </div>
        </Section>

        {/* Notifications */}
        <Section title="Notifications" icon={Bell}>
          <div className="divide-y divide-border">
            <SettingRow
              label="Sync notifications"
              description="Show desktop notifications after sync operations"
            >
              <Toggle checked={settings.syncNotifications} onChange={(v) => updateSetting("syncNotifications", v)} />
            </SettingRow>
            <SettingRow
              label="Error notifications"
              description="Show desktop notifications for errors"
            >
              <Toggle checked={settings.errorNotifications} onChange={(v) => updateSetting("errorNotifications", v)} />
            </SettingRow>
          </div>
        </Section>

        {/* Data */}
        <Section title="Data" icon={FolderOpen}>
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                onClick={handleOpenConfig}
                className="flex items-center gap-2 h-9 px-4 rounded-lg border border-border text-sm font-medium
                  text-text-secondary hover:bg-surface-3 transition-colors"
              >
                <FolderOpen className="w-4 h-4" />
                Open config folder
              </button>
              <button
                onClick={handleExportConfig}
                className="flex items-center gap-2 h-9 px-4 rounded-lg border border-border text-sm font-medium
                  text-text-secondary hover:bg-surface-3 transition-colors"
              >
                <FileJson className="w-4 h-4" />
                Export config
              </button>
            </div>
          </div>
        </Section>

        {/* Danger Zone */}
        <div className="rounded-xl border border-error/30 bg-surface-2 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3 border-b border-error/20">
            <AlertTriangle className="w-4 h-4 text-error" />
            <h3 className="text-sm font-semibold text-error">Danger Zone</h3>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Clear all configs
                </p>
                <p className="text-xs text-text-muted">
                  Remove all servers and client configurations
                </p>
              </div>
              <button
                onClick={() => setDangerDialog("clear")}
                className="flex items-center gap-2 h-8 px-3 rounded-lg border border-error/30 text-error text-xs font-medium
                  hover:bg-error/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </button>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Reset Conductor
                </p>
                <p className="text-xs text-text-muted">
                  Reset all settings to factory defaults
                </p>
              </div>
              <button
                onClick={() => setDangerDialog("reset")}
                className="flex items-center gap-2 h-8 px-3 rounded-lg border border-error/30 text-error text-xs font-medium
                  hover:bg-error/10 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-primary">
                  View raw config
                </p>
                <p className="text-xs text-text-muted">
                  Open the raw JSON config file
                </p>
              </div>
              <button
                onClick={handleOpenConfig}
                className="flex items-center gap-2 h-8 px-3 rounded-lg border border-border text-text-secondary text-xs font-medium
                  hover:bg-surface-3 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open
              </button>
            </div>
          </div>
        </div>

        {/* Bottom spacer */}
        <div className="h-6" />
      </div>

      {/* Danger confirm dialogs */}
      {dangerDialog === "clear" && (
        <DangerConfirmDialog
          title="Clear all configurations"
          description="This will permanently remove all servers and client configurations. This action cannot be undone."
          confirmWord="DELETE"
          onConfirm={handleClearConfigs}
          onCancel={() => setDangerDialog(null)}
        />
      )}
      {dangerDialog === "reset" && (
        <DangerConfirmDialog
          title="Reset Conductor"
          description="This will reset all settings, configurations, and preferences to their defaults. All data will be lost."
          confirmWord="RESET"
          onConfirm={handleReset}
          onCancel={() => setDangerDialog(null)}
        />
      )}
    </div>
  );
}
