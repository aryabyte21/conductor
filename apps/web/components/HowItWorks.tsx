import { ScanSearch, Settings2, RefreshCw, ArrowDown } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: ScanSearch,
    label: "IMPORT",
    title: "Scan your existing configs",
    description:
      "Conductor automatically detects your installed AI clients and imports their MCP server configurations. No manual setup required.",
    visual: (
      <div className="rounded-lg border border-[#27272A] bg-[#0A0A0B] p-4">
        <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-[#71717A]">
          Detected Configs
        </div>
        {[
          { name: "Claude Desktop", path: "~/Library/Application Support/Claude/", count: 4 },
          { name: "Cursor", path: "~/.cursor/", count: 3 },
          { name: "VS Code", path: "~/.vscode/", count: 2 },
        ].map((item) => (
          <div
            key={item.name}
            className="mb-2 flex items-center justify-between rounded-md bg-[#111113] px-3 py-2 last:mb-0"
          >
            <div>
              <div className="text-xs font-medium text-[#FAFAFA]">{item.name}</div>
              <div className="font-mono text-[10px] text-[#71717A]">{item.path}</div>
            </div>
            <div className="rounded-full bg-[#7C3AED]/10 px-2 py-0.5 text-[10px] font-medium text-[#7C3AED]">
              {item.count} servers
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    number: "02",
    icon: Settings2,
    label: "MANAGE",
    title: "One source of truth",
    description:
      "Edit, add, and remove MCP servers from a single beautiful interface. Configure environment variables, authentication, and server settings in one place.",
    visual: (
      <div className="rounded-lg border border-[#27272A] bg-[#0A0A0B] p-4">
        <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-[#71717A]">
          Server Configuration
        </div>
        <div className="space-y-2">
          <div className="rounded-md bg-[#111113] p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-[#FAFAFA]">github-mcp</span>
              <span className="rounded bg-[#10B981]/10 px-1.5 py-0.5 text-[10px] text-[#10B981]">
                active
              </span>
            </div>
            <div className="space-y-1 font-mono text-[10px] text-[#71717A]">
              <div>
                <span className="text-[#8B5CF6]">type</span>: sse
              </div>
              <div>
                <span className="text-[#8B5CF6]">url</span>: https://mcp.github.com
              </div>
              <div>
                <span className="text-[#8B5CF6]">auth</span>:{" "}
                <span className="text-[#10B981]">configured</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    number: "03",
    icon: RefreshCw,
    label: "SYNC",
    title: "Push to every app",
    description:
      "One click syncs your configuration to all connected clients. Conductor writes the right format for each app automatically.",
    visual: (
      <div className="rounded-lg border border-[#27272A] bg-[#0A0A0B] p-4">
        <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-[#71717A]">
          Sync Status
        </div>
        {[
          { name: "Claude Desktop", status: "synced" },
          { name: "Cursor", status: "synced" },
          { name: "VS Code", status: "synced" },
          { name: "Windsurf", status: "synced" },
        ].map((item) => (
          <div
            key={item.name}
            className="mb-2 flex items-center justify-between rounded-md bg-[#111113] px-3 py-2 last:mb-0"
          >
            <span className="text-xs text-[#FAFAFA]">{item.name}</span>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-[#10B981]" />
              <span className="text-[10px] text-[#10B981]">Synced</span>
            </div>
          </div>
        ))}
      </div>
    ),
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative border-t border-[#27272A]/50 py-24 sm:py-32"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#7C3AED]">
            How it works
          </p>
          <h2 className="section-heading mt-3">
            One config.{" "}
            <span className="bg-gradient-to-r from-[#7C3AED] to-[#8B5CF6] bg-clip-text text-transparent">
              Every tool.
            </span>
          </h2>
          <p className="section-subheading mx-auto">
            Three steps to never think about MCP configs again.
          </p>
        </div>

        {/* Steps */}
        <div className="mt-16 space-y-8">
          {steps.map((step, index) => (
            <div key={step.number}>
              <div className="grid items-center gap-8 md:grid-cols-2">
                {/* Text side */}
                <div className={index % 2 === 1 ? "md:order-2" : ""}>
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#7C3AED]/10">
                      <step.icon className="h-5 w-5 text-[#7C3AED]" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#7C3AED]">
                        Step {step.number}
                      </p>
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#71717A]">
                        {step.label}
                      </p>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-[#FAFAFA]">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-[#A1A1AA] leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Visual side */}
                <div className={index % 2 === 1 ? "md:order-1" : ""}>
                  {step.visual}
                </div>
              </div>

              {/* Connector arrow */}
              {index < steps.length - 1 && (
                <div className="flex justify-center py-4">
                  <ArrowDown className="h-5 w-5 text-[#27272A]" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
