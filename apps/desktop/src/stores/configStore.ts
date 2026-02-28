import { create } from "zustand";
import type {
  McpServer,
  AddServerRequest,
  UpdateServerRequest,
} from "@conductor/types";
import * as tauri from "@/lib/tauri";
import { toast } from "sonner";

interface ConfigState {
  servers: McpServer[];
  loading: boolean;
  error: string | null;

  fetchServers: () => Promise<void>;
  addServer: (request: AddServerRequest) => Promise<McpServer | null>;
  updateServer: (
    serverId: string,
    request: UpdateServerRequest
  ) => Promise<McpServer | null>;
  deleteServer: (serverId: string) => Promise<boolean>;
  toggleServer: (serverId: string, enabled: boolean) => Promise<void>;
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  servers: [],
  loading: false,
  error: null,

  fetchServers: async () => {
    set({ loading: true, error: null });
    try {
      const config = await tauri.readMasterConfig();
      set({ servers: config.servers, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ error: message, loading: false });
      toast.error("Failed to load servers", { description: message });
    }
  },

  addServer: async (request) => {
    try {
      const server = await tauri.addServer(request);
      set((state) => ({ servers: [...state.servers, server] }));
      toast.success("Server added", {
        description: `${server.displayName || server.name} has been added.`,
      });
      return server;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Failed to add server", { description: message });
      return null;
    }
  },

  updateServer: async (serverId, request) => {
    try {
      const updated = await tauri.updateServer(serverId, request);
      set((state) => ({
        servers: state.servers.map((s) => (s.id === serverId ? updated : s)),
      }));
      toast.success("Server updated");
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Failed to update server", { description: message });
      return null;
    }
  },

  deleteServer: async (serverId) => {
    const server = get().servers.find((s) => s.id === serverId);
    try {
      await tauri.deleteServer(serverId);
      set((state) => ({
        servers: state.servers.filter((s) => s.id !== serverId),
      }));
      toast.success("Server deleted", {
        description: `${server?.displayName || server?.name || "Server"} has been removed.`,
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Failed to delete server", { description: message });
      return false;
    }
  },

  toggleServer: async (serverId, enabled) => {
    const prev = get().servers;
    // Optimistic update
    set((state) => ({
      servers: state.servers.map((s) =>
        s.id === serverId ? { ...s, enabled } : s
      ),
    }));
    try {
      const updated = await tauri.toggleServer(serverId, enabled);
      set((state) => ({
        servers: state.servers.map((s) => (s.id === serverId ? updated : s)),
      }));
    } catch (err) {
      // Roll back
      set({ servers: prev });
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Failed to toggle server", { description: message });
    }
  },
}));
