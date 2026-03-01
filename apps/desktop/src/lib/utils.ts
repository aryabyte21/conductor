import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "-";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  // Handle future dates (e.g., OAuth token expiry)
  if (diffMs < 0) {
    const absDiffMs = Math.abs(diffMs);
    const futureSecs = Math.floor(absDiffMs / 1000);
    const futureMins = Math.floor(futureSecs / 60);
    const futureHours = Math.floor(futureMins / 60);
    const futureDays = Math.floor(futureHours / 24);

    if (futureSecs < 60) return "in a moment";
    if (futureMins < 60) return `in ${futureMins}m`;
    if (futureHours < 24) return `in ${futureHours}h`;
    if (futureDays < 7) return `in ${futureDays}d`;
    return date.toLocaleDateString();
  }

  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function generateAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    "#7C3AED", "#3B82F6", "#22C55E", "#F59E0B",
    "#EF4444", "#EC4899", "#8B5CF6", "#06B6D4",
    "#14B8A6", "#F97316",
  ];
  return colors[Math.abs(hash) % colors.length];
}

export function truncatePath(path: string, maxLen = 50): string {
  if (path.length <= maxLen) return path;
  const parts = path.split("/");
  if (parts.length <= 3) return path;
  // Keep last 3 segments for context (e.g., "Code/User/mcp.json")
  const tail = parts.slice(-3).join("/");
  return `~/\u2026/${tail}`;
}

export function validateServerName(name: string): string | null {
  if (!name) return "Name is required";
  if (name.length > 50) return "Name must be 50 characters or less";
  if (!/^[a-z0-9-]+$/.test(name)) return "Only lowercase letters, numbers, and hyphens";
  if (name.startsWith("-") || name.endsWith("-")) return "Cannot start or end with a hyphen";
  return null;
}
