"use client";

import { CheckCircle2 } from "lucide-react";

const clients: {
  name: string;
  color: string;
  description: string;
  logo: string;
  invert?: boolean;
}[] = [
  {
    name: "Claude",
    logo: "/claude-color.svg",
    color: "#D97757",
    description: "Desktop & Claude Code",
  },
  {
    name: "Cursor",
    logo: "/CUBE_2D_DARK.svg",
    color: "#71717A",
    description: "AI-powered code editor",
  },
  {
    name: "VS Code",
    logo: "/vscode.svg",
    color: "#007ACC",
    description: "GitHub Copilot MCP",
  },
  {
    name: "Windsurf",
    logo: "/Windsurf-black-symbol.svg",
    color: "#10B981",
    description: "Codeium's AI IDE",
    invert: true,
  },
  {
    name: "Zed",
    logo: "/zed-logo.svg",
    color: "#084CCF",
    description: "High-performance editor",
  },
  {
    name: "JetBrains",
    logo: "/jetbrains.svg",
    color: "#FC801D",
    description: "IntelliJ-based IDEs",
  },
  {
    name: "Codex CLI",
    logo: "/codex-color.svg",
    color: "#10A37F",
    description: "OpenAI's CLI agent",
  },
  {
    name: "Antigravity",
    logo: "/Google_Antigravity_Logo_2025_icon.svg",
    color: "#8B5CF6",
    description: "AI development platform",
  },
];

const upcoming = ["ChatGPT Desktop", "Continue", "Aider", "Amazon Q"];

export function Clients() {
  return (
    <section
      id="clients"
      className="relative border-t border-[#27272A]/50 py-24 sm:py-32"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-base font-semibold uppercase tracking-wider text-[#7C3AED]">
            Compatibility
          </p>
          <h2 className="section-heading mt-3">
            Works with your entire toolkit
          </h2>
          <p className="section-subheading mx-auto">
            Conductor supports the most popular MCP-enabled AI clients out of
            the box. One config, every tool.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4">
          {clients.map((client) => (
            <div
              key={client.name}
              className="card group flex flex-col items-center p-6 sm:p-8 text-center"
            >
              <div
                className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl transition-transform group-hover:scale-110"
                style={{
                  backgroundColor: client.color + "20",
                }}
              >
                <img
                  src={client.logo}
                  alt={client.name}
                  className={`h-12 w-12 rounded-lg object-contain${client.invert ? " invert" : ""}`}
                />
              </div>

              <h3 className="text-base font-semibold text-[#FAFAFA]">
                {client.name}
              </h3>
              <p className="mt-1 text-sm text-[#71717A]">
                {client.description}
              </p>

              <div className="mt-3 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
                <span className="text-sm font-medium text-[#10B981]">
                  Supported
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-base text-[#71717A]">
            <span className="font-medium text-[#A1A1AA]">More coming: </span>
            {upcoming.join(", ")}
          </p>
        </div>
      </div>
    </section>
  );
}
