import {
  Database,
  KeyRound,
  Layers,
  RefreshCw,
  ArrowRight,
  Shield,
  Share2,
  HardDrive,
} from "lucide-react";

const features = [
  {
    icon: Database,
    label: "Core",
    title: "Single Source of Truth",
    description:
      "Conductor stores all your MCP server configurations in one unified database. Edit once, and every connected client gets the update. No more hunting through scattered JSON files across your filesystem.",
    highlights: [
      "Unified server registry",
      "Per-client toggle control",
      "Visual config editor",
      "JSON import/export",
    ],
    visual: (
      <div className="rounded-xl border border-[#27272A] bg-[#0A0A0B] p-5">
        <div className="mb-4 flex items-center gap-2">
          <Database className="h-4 w-4 text-[#7C3AED]" />
          <span className="text-xs font-semibold text-[#FAFAFA]">Server Registry</span>
        </div>
        <div className="space-y-2">
          {[
            { name: "filesystem", type: "stdio", clients: 4, color: "#10B981" },
            { name: "github-mcp", type: "sse", clients: 3, color: "#3B82F6" },
            { name: "postgres-mcp", type: "stdio", clients: 2, color: "#F59E0B" },
            { name: "brave-search", type: "stdio", clients: 4, color: "#EC4899" },
          ].map((server) => (
            <div
              key={server.name}
              className="flex items-center justify-between rounded-lg bg-[#111113] px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: server.color }}
                />
                <span className="text-xs font-medium text-[#FAFAFA]">
                  {server.name}
                </span>
                <span className="rounded bg-[#18181B] px-1.5 py-0.5 text-[10px] text-[#71717A]">
                  {server.type}
                </span>
              </div>
              <span className="text-[10px] text-[#71717A]">
                {server.clients} clients
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: KeyRound,
    label: "Killer Feature",
    title: "Auth Once, Use Everywhere",
    description:
      "Configure API keys and authentication tokens once in Conductor. They're securely stored and automatically injected into every client's config at sync time. Rotate a key in one place, and it updates everywhere instantly.",
    highlights: [
      "Secure credential storage",
      "Auto-injection at sync",
      "One-click key rotation",
      "Environment variable support",
    ],
    visual: (
      <div className="rounded-xl border border-[#27272A] bg-[#0A0A0B] p-5">
        <div className="mb-4 flex items-center gap-2">
          <Shield className="h-4 w-4 text-[#10B981]" />
          <span className="text-xs font-semibold text-[#FAFAFA]">Credential Vault</span>
        </div>
        <div className="space-y-3">
          {[
            { label: "GITHUB_TOKEN", status: "Configured", rotated: "2 days ago" },
            { label: "OPENAI_API_KEY", status: "Configured", rotated: "1 week ago" },
            { label: "BRAVE_API_KEY", status: "Configured", rotated: "3 days ago" },
          ].map((cred) => (
            <div
              key={cred.label}
              className="rounded-lg bg-[#111113] p-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[#8B5CF6]">
                  {cred.label}
                </span>
                <span className="rounded-full bg-[#10B981]/10 px-2 py-0.5 text-[10px] font-medium text-[#10B981]">
                  {cred.status}
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="font-mono text-xs text-[#71717A]">
                  ••••••••••••••••
                </span>
                <span className="text-[10px] text-[#71717A]">
                  Rotated {cred.rotated}
                </span>
              </div>
            </div>
          ))}
        </div>
        {/* Flow visualization */}
        <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-[#71717A]">
          <span className="rounded bg-[#7C3AED]/10 px-2 py-1 text-[#7C3AED]">
            Vault
          </span>
          <ArrowRight className="h-3 w-3" />
          <span className="rounded bg-[#111113] px-2 py-1">Auto-inject</span>
          <ArrowRight className="h-3 w-3" />
          <span className="rounded bg-[#10B981]/10 px-2 py-1 text-[#10B981]">
            All Clients
          </span>
        </div>
      </div>
    ),
  },
  {
    icon: Layers,
    label: "Viral Feature",
    title: "MCP Stacks",
    description:
      "Bundle your MCP servers into shareable Stacks. Share a \"Web Dev Stack\" with your team or publish a \"Data Science Stack\" for the community. One-click install for anyone using Conductor.",
    highlights: [
      "Shareable server bundles",
      "One-click install",
      "Community marketplace",
      "Team collaboration",
    ],
    visual: (
      <div className="rounded-xl border border-[#27272A] bg-[#0A0A0B] p-5">
        <div className="mb-4 flex items-center gap-2">
          <Share2 className="h-4 w-4 text-[#7C3AED]" />
          <span className="text-xs font-semibold text-[#FAFAFA]">MCP Stacks</span>
        </div>
        <div className="space-y-3">
          {[
            {
              name: "Web Dev Stack",
              author: "@sarah",
              servers: ["filesystem", "github-mcp", "postgres-mcp"],
              installs: "2.4k",
            },
            {
              name: "Data Science Stack",
              author: "@mike",
              servers: ["jupyter-mcp", "pandas-mcp", "viz-server"],
              installs: "1.8k",
            },
          ].map((stack) => (
            <div
              key={stack.name}
              className="rounded-lg bg-[#111113] p-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-[#FAFAFA]">
                    {stack.name}
                  </span>
                  <span className="ml-2 text-[10px] text-[#71717A]">
                    by {stack.author}
                  </span>
                </div>
                <button className="rounded-md bg-[#7C3AED]/10 px-2.5 py-1 text-[10px] font-semibold text-[#7C3AED]">
                  Install
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {stack.servers.map((s) => (
                  <span
                    key={s}
                    className="rounded bg-[#18181B] px-1.5 py-0.5 text-[10px] text-[#A1A1AA]"
                  >
                    {s}
                  </span>
                ))}
              </div>
              <div className="mt-2 text-[10px] text-[#71717A]">
                {stack.installs} installs
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: RefreshCw,
    label: "Reliability",
    title: "Auto-Sync + Backup",
    description:
      "Conductor watches for changes and auto-syncs to keep every client up to date. Full version history lets you roll back any change. Your configs are always backed up and never lost.",
    highlights: [
      "Real-time file watching",
      "Automatic sync on change",
      "Full version history",
      "One-click rollback",
    ],
    visual: (
      <div className="rounded-xl border border-[#27272A] bg-[#0A0A0B] p-5">
        <div className="mb-4 flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-[#7C3AED]" />
          <span className="text-xs font-semibold text-[#FAFAFA]">Sync History</span>
        </div>
        <div className="space-y-2">
          {[
            { action: "Synced to Claude Desktop", time: "2 min ago", type: "sync" },
            { action: "Added brave-search server", time: "15 min ago", type: "add" },
            { action: "Updated github-mcp auth", time: "1 hour ago", type: "update" },
            { action: "Synced to all clients", time: "1 hour ago", type: "sync" },
            { action: "Backup created", time: "2 hours ago", type: "backup" },
          ].map((entry, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-md bg-[#111113] px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <div
                  className={`h-1.5 w-1.5 rounded-full ${
                    entry.type === "sync"
                      ? "bg-[#10B981]"
                      : entry.type === "add"
                        ? "bg-[#3B82F6]"
                        : entry.type === "update"
                          ? "bg-[#F59E0B]"
                          : "bg-[#71717A]"
                  }`}
                />
                <span className="text-xs text-[#FAFAFA]">{entry.action}</span>
              </div>
              <span className="text-[10px] text-[#71717A]">{entry.time}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

export function Features() {
  return (
    <section
      id="features"
      className="relative border-t border-[#27272A]/50 py-24 sm:py-32"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center">
          <p className="text-base font-semibold uppercase tracking-wider text-[#7C3AED]">
            Features
          </p>
          <h2 className="section-heading mt-3">
            Everything you need to manage MCP
          </h2>
          <p className="section-subheading mx-auto">
            Built by developers who were tired of the MCP config chaos.
          </p>
        </div>

        {/* Feature blocks (alternating layout) */}
        <div className="mt-16 space-y-24">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="grid items-center gap-12 md:grid-cols-2"
            >
              {/* Text side */}
              <div className={index % 2 === 1 ? "md:order-2" : ""}>
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7C3AED]/10">
                    <feature.icon className="h-4 w-4 text-[#7C3AED]" />
                  </div>
                  <span className="rounded-full bg-[#7C3AED]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#7C3AED]">
                    {feature.label}
                  </span>
                </div>
                <h3 className="mt-3 text-2xl font-bold text-[#FAFAFA] sm:text-3xl lg:text-4xl">
                  {feature.title}
                </h3>
                <p className="mt-4 text-base leading-relaxed text-[#A1A1AA] sm:text-lg">
                  {feature.description}
                </p>
                <ul className="mt-6 space-y-3">
                  {feature.highlights.map((highlight) => (
                    <li
                      key={highlight}
                      className="flex items-center gap-3 text-base text-[#A1A1AA]"
                    >
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#7C3AED]/10">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#7C3AED]" />
                      </div>
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Visual side */}
              <div className={index % 2 === 1 ? "md:order-1" : ""}>
                {feature.visual}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
