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

// Bundled SVG/PNG logos for reliable fallback when the app isn't installed
const bundledLogos: Record<string, { src: string; invert?: boolean }> = {
  "claude-desktop": { src: "/logos/claude.svg" },
  "claude-code": { src: "/logos/claude.svg" },
  cursor: { src: "/logos/cursor.png" },
  vscode: { src: "/logos/vscode.svg" },
  windsurf: { src: "/logos/windsurf.svg", invert: true },
  zed: { src: "/logos/zed.svg" },
  jetbrains: { src: "/logos/jetbrains.svg" },
  codex: { src: "/logos/codex.svg" },
};

// Module-level cache so we don't re-fetch across re-renders
const iconCache = new Map<string, string | null>();

export function ClientLogo({
  clientId,
  displayName,
  size = 48,
}: {
  clientId: string;
  displayName: string;
  size?: number;
}) {
  const [iconSrc, setIconSrc] = useState<string | null>(
    iconCache.get(clientId) ?? null
  );
  const [loaded, setLoaded] = useState(iconCache.has(clientId));
  const [imgError, setImgError] = useState(false);

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

  // Primary: macOS .app icon from Tauri
  if (loaded && iconSrc && !imgError) {
    return (
      <img
        src={iconSrc}
        alt={displayName}
        className="rounded-2xl shrink-0 object-cover"
        style={{ width: size, height: size }}
        onError={() => setImgError(true)}
      />
    );
  }

  // Fallback 1: Bundled SVG/PNG logo
  const bundled = bundledLogos[clientId];
  if (bundled) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl shrink-0 overflow-hidden"
        style={{
          width: size,
          height: size,
          backgroundColor: (clientColors[clientId] || "#71717A") + "15",
        }}
      >
        <img
          src={bundled.src}
          alt={displayName}
          className={`object-contain${bundled.invert ? " invert" : ""}`}
          style={{ width: size * 0.65, height: size * 0.65 }}
        />
      </div>
    );
  }

  // Fallback 2: Colored circle with initials
  const color = clientColors[clientId] || "#71717A";
  const initials = clientInitials[clientId] || displayName.charAt(0);

  return (
    <div
      className="flex items-center justify-center rounded-2xl shrink-0 font-bold"
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
