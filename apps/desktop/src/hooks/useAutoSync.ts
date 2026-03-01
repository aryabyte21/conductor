import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import * as tauri from "@/lib/tauri";
import { useClientStore } from "@/stores/clientStore";
import { toast } from "sonner";
import type { AppSettings } from "@conductor/types";

/**
 * Listens for "client-config-changed" events from the file watcher
 * and triggers auto-sync when enabled in settings.
 *
 * Also provides `triggerAutoSync()` for use after config mutations.
 */
export function useAutoSync() {
  const settingsRef = useRef<AppSettings | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const syncToAllClients = useClientStore((s) => s.syncToAllClients);
  const detectClients = useClientStore((s) => s.detectClients);

  // Load settings on mount and refresh periodically
  useEffect(() => {
    const loadSettings = () => {
      tauri.getSettings().then((s) => {
        settingsRef.current = s;
      }).catch(() => {});
    };

    loadSettings();
    const interval = setInterval(loadSettings, 10_000);
    return () => clearInterval(interval);
  }, []);

  // Listen for file watcher events from the Rust backend
  useEffect(() => {
    const unlisten = listen<string[]>("client-config-changed", (event) => {
      const settings = settingsRef.current;
      if (!settings) return;

      // Notify about external config changes
      if (settings.notifyExternal) {
        const paths = event.payload;
        const fileNames = paths.map((p) => p.split("/").pop() || p);
        toast.info("External config change detected", {
          description: fileNames.join(", "),
        });
      }

      // Refresh client detection to pick up external changes
      detectClients();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [detectClients]);

  // Auto-sync after successful OAuth authentication so the fresh token
  // is immediately pushed to all clients without manual intervention.
  useEffect(() => {
    const unlisten = listen<{ serverId: string; provider: string; success: boolean }>(
      "oauth-callback-received",
      (event) => {
        if (!event.payload.success) return;

        toast.success("OAuth authentication successful", {
          description: `Syncing ${event.payload.provider} credentials to all clients...`,
        });

        // Sync immediately — don't wait for the auto-sync delay
        syncToAllClients();
      }
    );

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [syncToAllClients]);

  // Return a function that configStore can call after mutations
  return {
    triggerAutoSync: () => {
      const settings = settingsRef.current;
      if (!settings?.autoSync) return;

      // Clear any pending sync timer
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }

      const delay = (settings.syncDelay ?? 5) * 1000;

      if (delay === 0) {
        syncToAllClients();
      } else {
        syncTimerRef.current = setTimeout(() => {
          syncToAllClients();
        }, delay);
      }
    },
  };
}
