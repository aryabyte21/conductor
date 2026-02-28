import { create } from "zustand";
import type { ClientDetection, ImportResult, SyncResult } from "@conductor/types";
import * as tauri from "@/lib/tauri";
import { toast } from "sonner";

interface ClientState {
  clients: ClientDetection[];
  loading: boolean;

  detectClients: () => Promise<void>;
  importFromClient: (clientId: string) => Promise<ImportResult | null>;
  syncToClient: (clientId: string) => Promise<SyncResult | null>;
  syncToAllClients: () => Promise<SyncResult[]>;
}

export const useClientStore = create<ClientState>((set, get) => ({
  clients: [],
  loading: false,

  detectClients: async () => {
    set({ loading: true });
    try {
      const clients = await tauri.detectClients();
      set({ clients, loading: false });
    } catch (err) {
      set({ loading: false });
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Failed to detect clients", { description: message });
    }
  },

  importFromClient: async (clientId) => {
    const client = get().clients.find((c) => c.clientId === clientId);
    try {
      const result = await tauri.importFromClient(clientId);
      toast.success(`Imported from ${client?.displayName || clientId}`, {
        description: `Added ${result.added} server${result.added !== 1 ? 's' : ''}, skipped ${result.skipped}.`,
      });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to import from ${client?.displayName || clientId}`, {
        description: message,
      });
      return null;
    }
  },

  syncToClient: async (clientId) => {
    const client = get().clients.find((c) => c.clientId === clientId);
    try {
      const result = await tauri.syncToClient(clientId);
      if (result.success) {
        toast.success(`Synced to ${client?.displayName || clientId}`, {
          description: `${result.serversWritten} server${result.serversWritten !== 1 ? 's' : ''} written.`,
        });
        // Refresh client data
        const clients = await tauri.detectClients();
        set({ clients });
      } else {
        toast.error(`Sync failed for ${client?.displayName || clientId}`, {
          description: result.error,
        });
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to sync to ${client?.displayName || clientId}`, {
        description: message,
      });
      return null;
    }
  },

  syncToAllClients: async () => {
    try {
      const results = await tauri.syncToAllClients();
      const succeeded = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      if (failed === 0) {
        toast.success("Synced to all clients", {
          description: `${succeeded} client${succeeded !== 1 ? 's' : ''} updated.`,
        });
      } else {
        toast.warning("Sync completed with errors", {
          description: `${succeeded} succeeded, ${failed} failed.`,
        });
      }

      const clients = await tauri.detectClients();
      set({ clients });

      return results;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Failed to sync", { description: message });
      return [];
    }
  },
}));
