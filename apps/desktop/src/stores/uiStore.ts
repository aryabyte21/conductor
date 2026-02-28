import { create } from "zustand";

export type ActiveView =
  | "servers"
  | "clients"
  | "registry"
  | "stacks"
  | "activity"
  | "settings";

interface UIState {
  activeView: ActiveView;
  commandPaletteOpen: boolean;
  selectedServerId: string | null;
  addServerModalOpen: boolean;
  serverDetailOpen: boolean;

  setActiveView: (view: ActiveView) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setSelectedServerId: (id: string | null) => void;
  setAddServerModalOpen: (open: boolean) => void;
  setServerDetailOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeView: "servers",
  commandPaletteOpen: false,
  selectedServerId: null,
  addServerModalOpen: false,
  serverDetailOpen: false,

  setActiveView: (view) => set({ activeView: view }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setSelectedServerId: (id) => set({ selectedServerId: id }),
  setAddServerModalOpen: (open) => set({ addServerModalOpen: open }),
  setServerDetailOpen: (open) => set({ serverDetailOpen: open }),
}));
