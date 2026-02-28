import { useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { ServersView } from "@/views/ServersView";
import { ClientsView } from "@/views/ClientsView";
import { RegistryView } from "@/views/RegistryView";
import { StacksView } from "@/views/StacksView";
import { ActivityView } from "@/views/ActivityView";
import { SettingsView } from "@/views/SettingsView";
import { CommandPalette } from "@/components/CommandPalette";
import { Toaster } from "sonner";
import { useUIStore } from "@/stores/uiStore";
import { useConfigStore } from "@/stores/configStore";
import { useClientStore } from "@/stores/clientStore";

export function App() {
  const activeView = useUIStore((s) => s.activeView);
  const commandPaletteOpen = useUIStore((s) => s.commandPaletteOpen);
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const fetchServers = useConfigStore((s) => s.fetchServers);
  const detectClients = useClientStore((s) => s.detectClients);

  useEffect(() => {
    fetchServers();
    detectClients();
  }, [fetchServers, detectClients]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  const renderView = () => {
    switch (activeView) {
      case "servers":
        return <ServersView />;
      case "clients":
        return <ClientsView />;
      case "registry":
        return <RegistryView />;
      case "stacks":
        return <StacksView />;
      case "activity":
        return <ActivityView />;
      case "settings":
        return <SettingsView />;
      default:
        return <ServersView />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Title bar drag region */}
      <div
        className="fixed top-0 left-0 right-0 h-8 z-50"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      />

      <Sidebar />

      <main className="flex-1 overflow-hidden pt-8">
        {renderView()}
      </main>

      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />

      <Toaster
        position="bottom-right"
        theme="dark"
        toastOptions={{
          style: {
            background: "#18181B",
            border: "1px solid #27272A",
            color: "#FAFAFA",
          },
        }}
      />
    </div>
  );
}
