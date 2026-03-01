import { useState, useEffect, useMemo } from "react";
import { cn, generateAvatarColor } from "@/lib/utils";
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
      <div
        className={cn(
          "flex items-center justify-center rounded-xl shrink-0 overflow-hidden bg-white/5",
          className
        )}
        style={{ width: size, height: size }}
      >
        <img
          src={resolvedUrl}
          alt={name}
          className="object-contain"
          style={{ width: size * 0.75, height: size * 0.75 }}
          onError={() => setImgError(true)}
        />
      </div>
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
