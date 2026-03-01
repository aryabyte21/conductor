"use client";

import { useState, useEffect } from "react";

export type Arch = "arm64" | "x64" | null;

export interface ReleaseInfo {
  version: string | null;
  arm64: string | null;
  x64: string | null;
  release: string | null;
}

/**
 * Detect if the user is on Apple Silicon or Intel Mac.
 *
 * Strategy:
 *   1. navigator.userAgentData (Chrome/Edge) — returns "arm" for Apple Silicon
 *   2. WebGL renderer string (Safari) — returns "Apple M1", "Apple M2", etc.
 *   3. Default to arm64 (most Macs sold since late 2020)
 */
function detectArch(): Promise<Arch> {
  return new Promise((resolve) => {
    // Not macOS → can't determine
    if (typeof navigator === "undefined") return resolve(null);

    const ua = navigator.userAgent;
    if (!/Mac/.test(ua)) return resolve(null);

    // Method 1: Chrome/Edge high-entropy UA data
    const uaData = (navigator as unknown as { userAgentData?: { getHighEntropyValues: (hints: string[]) => Promise<{ architecture?: string }> } }).userAgentData;
    if (uaData?.getHighEntropyValues) {
      uaData
        .getHighEntropyValues(["architecture"])
        .then((vals) => {
          if (vals.architecture === "arm") resolve("arm64");
          else if (vals.architecture === "x86") resolve("x64");
          else resolve("arm64"); // fallback
        })
        .catch(() => resolve(detectArchFromWebGL()));
      return;
    }

    // Method 2: WebGL for Safari
    resolve(detectArchFromWebGL());
  });
}

function detectArchFromWebGL(): Arch {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return "arm64";

    const debugInfo = (gl as WebGLRenderingContext).getExtension("WEBGL_debug_renderer_info");
    if (!debugInfo) return "arm64";

    const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string;

    // Apple Silicon GPUs: "Apple M1", "Apple M2 Pro", "Apple M3 Max", "Apple GPU", etc.
    if (/Apple\s(M\d|GPU)/i.test(renderer)) return "arm64";

    // Intel GPUs: "Intel(R) Iris", "Intel(R) UHD", "Intel(R) HD Graphics"
    if (/Intel/i.test(renderer)) return "x64";

    // AMD GPUs in older Mac Pros
    if (/AMD|Radeon/i.test(renderer)) return "x64";
  } catch {
    // canvas/WebGL not available
  }
  return "arm64"; // safe default — most modern Macs are Apple Silicon
}

/**
 * Shared hook for all download buttons across the site.
 * Returns detected architecture, release URLs, and the correct download link.
 */
export function useDownload() {
  const [arch, setArch] = useState<Arch>(null);
  const [release, setRelease] = useState<ReleaseInfo>({
    version: null,
    arm64: null,
    x64: null,
    release: null,
  });

  useEffect(() => {
    detectArch().then(setArch);

    fetch("/api/latest-release")
      .then((r) => r.json())
      .then((data: ReleaseInfo) => setRelease(data))
      .catch(() => {});
  }, []);

  const fallbackUrl = "https://github.com/aryabyte21/conductor/releases/latest";

  // Pick the right DMG based on detected arch
  const dmgUrl =
    arch === "x64"
      ? (release.x64 ?? release.arm64 ?? fallbackUrl)
      : (release.arm64 ?? fallbackUrl);

  const archLabel = arch === "x64" ? "Intel" : "Apple Silicon";

  return { arch, archLabel, release, dmgUrl, fallbackUrl };
}
