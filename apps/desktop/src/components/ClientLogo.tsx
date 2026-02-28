import { useState, useEffect } from "react";
import * as tauri from "@/lib/tauri";

const clientColors: Record<string, string> = {
  "claude-desktop": "#D97757",
  cursor: "#22D3EE",
  vscode: "#3B82F6",
  "claude-code": "#D97757",
  windsurf: "#10B981",
  zed: "#F59E0B",
  jetbrains: "#FC801D",
  codex: "#F97316",
  antigravity: "#4285F4",
};

const clientInitials: Record<string, string> = {
  "claude-desktop": "C",
  cursor: "Cu",
  vscode: "VS",
  "claude-code": "CC",
  windsurf: "W",
  zed: "Z",
  jetbrains: "JB",
  codex: "OC",
  antigravity: "AG",
};

// Module-level cache so we don't re-fetch across re-renders
const iconCache = new Map<string, string | null>();

export function ClientLogo({
  clientId,
  displayName,
  size = 40,
}: {
  clientId: string;
  displayName: string;
  size?: number;
}) {
  const [iconSrc, setIconSrc] = useState<string | null>(
    iconCache.get(clientId) ?? null
  );
  const [loaded, setLoaded] = useState(iconCache.has(clientId));

  useEffect(() => {
    if (iconCache.has(clientId)) {
      setIconSrc(iconCache.get(clientId) ?? null);
      setLoaded(true);
      return;
    }

    tauri
      .getClientIcon(clientId)
      .then((result) => {
        iconCache.set(clientId, result);
        setIconSrc(result);
        setLoaded(true);
      })
      .catch(() => {
        iconCache.set(clientId, null);
        setLoaded(true);
      });
  }, [clientId]);

  if (loaded && iconSrc) {
    return (
      <img
        src={iconSrc}
        alt={displayName}
        className="rounded-xl shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  // Fallback: colored circle with initials
  const color = clientColors[clientId] || "#71717A";
  const initials = clientInitials[clientId] || displayName.charAt(0);

  return (
    <div
      className="flex items-center justify-center rounded-xl shrink-0 font-bold"
      style={{
        width: size,
        height: size,
        backgroundColor: color + "15",
        color: color,
        fontSize: size * 0.32,
      }}
    >
      {initials}
    </div>
  );
}
