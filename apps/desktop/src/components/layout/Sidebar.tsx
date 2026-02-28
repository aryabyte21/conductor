import {
  Server,
  Monitor,
  Layers,
  Search,
  Activity,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore, type ActiveView } from "@/stores/uiStore";

interface NavItem {
  id: ActiveView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { id: "servers", label: "Servers", icon: Server },
  { id: "clients", label: "Clients", icon: Monitor },
  { id: "stacks", label: "Stacks", icon: Layers },
  { id: "registry", label: "Registry", icon: Search },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const activeView = useUIStore((s) => s.activeView);
  const setActiveView = useUIStore((s) => s.setActiveView);

  return (
    <aside className="w-[220px] h-full flex flex-col bg-surface-1 border-r border-border shrink-0">
      {/* macOS traffic-light drag region */}
      <div className="h-8 shrink-0" />

      {/* Logo area */}
      <div className="flex items-center gap-2.5 px-5 py-3 mb-2">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg overflow-hidden shrink-0">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="8" fill="url(#conductor-sidebar)" />
            <circle cx="10" cy="16" r="3" fill="white" fillOpacity="0.95" />
            <path d="M13 16 C17 16 19 9 24 9" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" strokeOpacity="0.9" />
            <circle cx="24" cy="9" r="1.5" fill="white" fillOpacity="0.9" />
            <line x1="13" y1="16" x2="24" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.7" />
            <circle cx="24" cy="16" r="1.5" fill="white" fillOpacity="0.7" />
            <path d="M13 16 C17 16 19 23 24 23" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" strokeOpacity="0.5" />
            <circle cx="24" cy="23" r="1.5" fill="white" fillOpacity="0.5" />
            <defs>
              <linearGradient id="conductor-sidebar" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop stopColor="#7C3AED" />
                <stop offset="1" stopColor="#6D28D9" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <span className="text-[15px] font-semibold text-text-primary tracking-[-0.01em]">
          Conductor
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={cn(
                "flex items-center gap-3 w-full h-9 px-3 rounded-lg text-[13px] font-medium transition-colors duration-150",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/50",
                isActive
                  ? "bg-accent/15 text-accent"
                  : "text-text-secondary hover:bg-surface-3 hover:text-text-primary"
              )}
              style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            >
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0",
                  isActive ? "text-accent" : "text-text-muted"
                )}
              />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Version footer */}
      <div className="px-5 py-4">
        <span className="text-[11px] text-text-muted">v1.0.0</span>
      </div>
    </aside>
  );
}
