import { create } from "zustand";
import type { SyncResult } from "@conductor/types";

interface SyncState {
  activeSyncs: Map<string, boolean>;
  results: SyncResult[];

  startSync: (clientId: string) => void;
  completeSync: (result: SyncResult) => void;
  isSyncing: (clientId: string) => boolean;
  clearResults: () => void;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  activeSyncs: new Map(),
  results: [],

  startSync: (clientId) => {
    set((state) => {
      const next = new Map(state.activeSyncs);
      next.set(clientId, true);
      return { activeSyncs: next };
    });
  },

  completeSync: (result) => {
    set((state) => {
      const next = new Map(state.activeSyncs);
      next.delete(result.clientId);
      return {
        activeSyncs: next,
        results: [result, ...state.results].slice(0, 100),
      };
    });
  },

  isSyncing: (clientId) => {
    return get().activeSyncs.get(clientId) === true;
  },

  clearResults: () => set({ results: [] }),
}));
