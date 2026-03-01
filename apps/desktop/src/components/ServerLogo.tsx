import { useState, useEffect, useMemo } from "react";
import { generateAvatarColor } from "@/lib/utils";
import * as tauri from "@/lib/tauri";

// Module-level cache so we don't re-fetch across re-renders
const logoCache = new Map<string, string | null>();

interface ServerLogoProps {
  name: string;
  command?: string;
  url?: string;
  iconUrl?: string;
  size?: number;
  className?: string;
}

export function ServerLogo({
  name,
  command,
  url,
  iconUrl,
  size = 36,
  className,
}: ServerLogoProps) {
  const cacheKey = `${name}:${command || ""}:${url || ""}`;
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(
    iconUrl || logoCache.get(cacheKey) || null
  );
  const [loaded, setLoaded] = useState(!!iconUrl || logoCache.has(cacheKey));
  const [imgError, setImgError] = useState(false);

  const color = useMemo(() => generateAvatarColor(name), [name]);
  const letter = (name[0] || "?").toUpperCase();

  useEffect(() => {
    // If we already have an iconUrl from the server data, use it
    if (iconUrl) {
      setResolvedUrl(iconUrl);
      setLoaded(true);
      return;
    }

    // Check cache
    if (logoCache.has(cacheKey)) {
      setResolvedUrl(logoCache.get(cacheKey) || null);
      setLoaded(true);
      return;
    }

    // Resolve via Tauri backend
    tauri
      .resolveServerLogo(name, command, url)
      .then((result) => {
        logoCache.set(cacheKey, result);
        setResolvedUrl(result);
        setLoaded(true);
      })
      .catch(() => {
        logoCache.set(cacheKey, null);
        setLoaded(true);
      });
  }, [name, command, url, iconUrl, cacheKey]);

  // Show resolved image
  if (loaded && resolvedUrl && !imgError) {
    return (
      <img
        src={resolvedUrl}
        alt={name}
        className={`rounded-xl object-cover shrink-0 bg-white/10 ${className || ""}`}
        style={{ width: size, height: size }}
        onError={() => setImgError(true)}
      />
    );
  }

  // Letter avatar fallback
  return (
    <div
      className={`flex items-center justify-center rounded-xl shrink-0 font-semibold text-white ${className || ""}`}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        fontSize: size * 0.38,
      }}
    >
      {letter}
    </div>
  );
}
