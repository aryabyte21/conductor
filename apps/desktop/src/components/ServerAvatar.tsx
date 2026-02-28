import { useMemo } from "react";
import { cn, generateAvatarColor } from "@/lib/utils";
import {
  Server,
  Database,
  Globe,
  Code,
  Cloud,
  FileText,
  Boxes,
  Bot,
  Braces,
  Terminal,
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  server: Server,
  database: Database,
  globe: Globe,
  code: Code,
  cloud: Cloud,
  file: FileText,
  boxes: Boxes,
  bot: Bot,
  braces: Braces,
  terminal: Terminal,
};

interface ServerAvatarProps {
  name: string;
  logoUrl?: string;
  size?: number;
  className?: string;
}

export function ServerAvatar({
  name,
  logoUrl,
  size = 32,
  className,
}: ServerAvatarProps) {
  const color = useMemo(() => generateAvatarColor(name), [name]);
  const letter = (name[0] || "?").toUpperCase();

  // Check for icon: prefix
  if (logoUrl && logoUrl.startsWith("icon:")) {
    const iconName = logoUrl.slice(5).toLowerCase();
    const LucideIcon = iconMap[iconName];

    if (LucideIcon) {
      return (
        <div
          className={cn(
            "flex items-center justify-center rounded-full shrink-0",
            className
          )}
          style={{
            width: size,
            height: size,
            backgroundColor: `${color}20`,
          }}
        >
          <LucideIcon
            className="w-1/2 h-1/2"
            style={{ color }}
          />
        </div>
      );
    }
  }

  // Image URL
  if (logoUrl && !logoUrl.startsWith("icon:")) {
    return (
      <img
        src={logoUrl}
        alt={name}
        className={cn("rounded-full object-cover shrink-0", className)}
        style={{ width: size, height: size }}
        onError={(e) => {
          // Fallback to letter avatar on image load error
          const target = e.currentTarget;
          target.style.display = "none";
          const fallback = target.nextElementSibling as HTMLElement;
          if (fallback) fallback.style.display = "flex";
        }}
      />
    );
  }

  // Letter avatar fallback
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full shrink-0 font-semibold text-white",
        className
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        fontSize: size * 0.4,
      }}
    >
      {letter}
    </div>
  );
}
