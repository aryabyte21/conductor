import { Copy, GitFork, KeyRound } from "lucide-react";

const painPoints = [
  {
    icon: Copy,
    title: "The Copy-Paste Loop",
    description:
      "Every new AI tool means finding the config file, copying JSON, pasting it, fixing the paths, and hoping you got the syntax right. Again.",
    visual: (
      <div className="mt-4 space-y-2">
        {["claude_desktop_config.json", "cursor/mcp.json", ".vscode/mcp.json", "windsurf/mcp.json"].map(
          (file) => (
            <div
              key={file}
              className="flex items-center gap-2 rounded-md bg-[#0A0A0B] px-3 py-1.5 font-mono text-xs text-[#71717A]"
            >
              <Copy className="h-3 w-3 text-[#7C3AED]/50" />
              {file}
            </div>
          )
        )}
      </div>
    ),
  },
  {
    icon: GitFork,
    title: "The Config Drift",
    description:
      "You updated the server in Cursor but forgot about Claude Desktop. Now your configs are out of sync and nothing works the same way twice.",
    visual: (
      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2 rounded-md bg-[#0A0A0B] px-3 py-1.5 font-mono text-xs">
          <span className="text-[#10B981]">Claude Desktop</span>
          <span className="text-[#71717A]">v2.1.0</span>
        </div>
        <div className="flex items-center gap-2 rounded-md bg-[#0A0A0B] px-3 py-1.5 font-mono text-xs">
          <span className="text-[#F59E0B]">Cursor</span>
          <span className="text-[#71717A]">v2.0.3</span>
          <span className="ml-auto rounded bg-[#F59E0B]/10 px-1.5 py-0.5 text-[10px] text-[#F59E0B]">
            outdated
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-md bg-[#0A0A0B] px-3 py-1.5 font-mono text-xs">
          <span className="text-[#EF4444]">VS Code</span>
          <span className="text-[#71717A]">v1.9.0</span>
          <span className="ml-auto rounded bg-[#EF4444]/10 px-1.5 py-0.5 text-[10px] text-[#EF4444]">
            broken
          </span>
        </div>
      </div>
    ),
  },
  {
    icon: KeyRound,
    title: "The Plaintext Secret",
    description:
      "API keys sitting in plain JSON files across your filesystem. No encryption, no central management, no way to rotate them easily.",
    visual: (
      <div className="mt-4 rounded-md bg-[#0A0A0B] p-3 font-mono text-xs">
        <div className="text-[#71717A]">{`{`}</div>
        <div className="pl-4">
          <span className="text-[#8B5CF6]">&quot;env&quot;</span>
          <span className="text-[#71717A]">: {`{`}</span>
        </div>
        <div className="pl-8">
          <span className="text-[#8B5CF6]">&quot;OPENAI_KEY&quot;</span>
          <span className="text-[#71717A]">: </span>
          <span className="text-[#EF4444]">&quot;sk-proj-abc12...&quot;</span>
          <span className="ml-2 text-[#EF4444]/50">{"// <-- yikes"}</span>
        </div>
        <div className="pl-4 text-[#71717A]">{`}`}</div>
        <div className="text-[#71717A]">{`}`}</div>
      </div>
    ),
  },
];

export function Problem() {
  return (
    <section className="relative border-t border-[#27272A]/50 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#7C3AED]">
            The Problem
          </p>
          <h2 className="section-heading mt-3">Sound familiar?</h2>
          <p className="section-subheading mx-auto">
            Managing MCP configs across multiple AI tools is a mess. You
            shouldn&apos;t need a PhD in JSON wrangling just to use your servers
            everywhere.
          </p>
        </div>

        {/* Pain point cards */}
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {painPoints.map((point) => (
            <div key={point.title} className="card">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#7C3AED]/10">
                <point.icon className="h-5 w-5 text-[#7C3AED]" />
              </div>
              <h3 className="text-lg font-semibold text-[#FAFAFA]">
                {point.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#A1A1AA]">
                {point.description}
              </p>
              {point.visual}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
