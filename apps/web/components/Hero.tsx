"use client";

import { ArrowRight, Apple, Shield, Globe, Scale } from "lucide-react";

const clients = [
  { name: "Claude Desktop", icon: "C", color: "#D97757", status: "Synced", servers: "4 servers" },
  { name: "Cursor", icon: "Cu", color: "#22D3EE", status: "Synced", servers: "4 servers" },
  { name: "VS Code", icon: "VS", color: "#3B82F6", status: "Synced", servers: "3 servers" },
  { name: "Windsurf", icon: "W", color: "#10B981", status: "Synced", servers: "2 servers" },
];

const servers = [
  { name: "filesystem", type: "stdio", status: "active" },
  { name: "postgres-mcp", type: "stdio", status: "active" },
  { name: "github-mcp", type: "sse", status: "active" },
  { name: "brave-search", type: "stdio", status: "active" },
];

function TrafficLights() {
  return (
    <div className="flex items-center gap-2">
      <div className="h-3 w-3 rounded-full bg-[#FF5F57]" />
      <div className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
      <div className="h-3 w-3 rounded-full bg-[#28C840]" />
    </div>
  );
}

function AppScreenshot() {
  return (
    <div className="relative mx-auto w-full max-w-4xl">
      {/* Glow effect behind the window */}
      <div className="absolute -inset-4 rounded-2xl bg-gradient-to-b from-[#7C3AED]/20 via-transparent to-transparent blur-2xl" />

      {/* macOS Window Frame */}
      <div className="relative overflow-hidden rounded-xl border border-[#27272A] bg-[#0A0A0B] shadow-2xl shadow-black/50">
        {/* Title bar */}
        <div className="flex items-center gap-4 border-b border-[#27272A] bg-[#111113] px-4 py-3">
          <TrafficLights />
          <div className="flex-1 text-center">
            <span className="text-xs text-[#71717A]">Conductor</span>
          </div>
          <div className="w-[52px]" /> {/* Balance the traffic lights */}
        </div>

        {/* App body */}
        <div className="flex min-h-[380px]">
          {/* Sidebar */}
          <div className="w-48 shrink-0 border-r border-[#27272A] bg-[#111113] p-3">
            <div className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-wider text-[#71717A]">
              Navigation
            </div>
            {[
              { label: "Clients", active: true },
              { label: "Servers", active: false },
              { label: "Stacks", active: false },
              { label: "Settings", active: false },
            ].map((item) => (
              <div
                key={item.label}
                className={`mb-1 rounded-md px-2 py-1.5 text-xs ${
                  item.active
                    ? "bg-[#7C3AED]/15 text-[#8B5CF6]"
                    : "text-[#A1A1AA]"
                }`}
              >
                {item.label}
              </div>
            ))}

            {/* Mini server list in sidebar */}
            <div className="mb-3 mt-6 px-2 text-[10px] font-semibold uppercase tracking-wider text-[#71717A]">
              Servers
            </div>
            {servers.map((s) => (
              <div
                key={s.name}
                className="mb-1 flex items-center gap-2 rounded-md px-2 py-1 text-[11px] text-[#A1A1AA]"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                {s.name}
              </div>
            ))}
          </div>

          {/* Main content: Clients view */}
          <div className="flex-1 p-5">
            <div className="mb-1 text-sm font-semibold text-[#FAFAFA]">
              Clients
            </div>
            <div className="mb-4 text-xs text-[#71717A]">
              Manage MCP client configurations
            </div>

            {/* Client cards */}
            <div className="grid grid-cols-2 gap-3">
              {clients.map((client) => (
                <div
                  key={client.name}
                  className="rounded-lg border border-[#27272A] bg-[#18181B] p-3 transition-colors hover:border-[#7C3AED]/30"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold text-white"
                        style={{ backgroundColor: client.color + "20", color: client.color }}
                      >
                        {client.icon}
                      </div>
                      <div>
                        <div className="text-xs font-medium text-[#FAFAFA]">
                          {client.name}
                        </div>
                        <div className="text-[10px] text-[#71717A]">
                          {client.servers}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-[#10B981]" />
                      <span className="text-[10px] text-[#10B981]">
                        {client.status}
                      </span>
                    </div>
                  </div>

                  {/* Mini progress bar */}
                  <div className="mt-2 h-1 w-full rounded-full bg-[#27272A]">
                    <div
                      className="h-1 rounded-full bg-[#10B981]"
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom status bar */}
            <div className="mt-4 flex items-center justify-between rounded-lg bg-[#111113] px-3 py-2">
              <div className="flex items-center gap-2 text-[10px] text-[#71717A]">
                <div className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                All configs synced
              </div>
              <div className="text-[10px] text-[#71717A]">
                Last sync: just now
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative pt-16">
      {/* Gradient mesh background */}
      <div className="gradient-mesh absolute inset-0 h-full w-full" />

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-24 sm:px-6 sm:pt-32 lg:px-8 lg:pt-40">
        {/* Eyebrow badge */}
        <div className="mb-8 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#27272A] bg-[#111113]/80 px-4 py-1.5 text-sm text-[#A1A1AA] backdrop-blur-sm">
            <span className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              Open source
            </span>
            <span className="text-[#27272A]">/</span>
            <span className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              Free forever
            </span>
            <span className="text-[#27272A]">/</span>
            <span className="flex items-center gap-1.5">
              <Apple className="h-3.5 w-3.5" />
              macOS first
            </span>
          </div>
        </div>

        {/* Headline */}
        <h1 className="mx-auto max-w-4xl text-center text-4xl font-bold leading-tight tracking-tight text-[#FAFAFA] sm:text-5xl lg:text-7xl">
          Configure your MCP servers once.{" "}
          <span className="bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A78BFA] bg-clip-text text-transparent">
            Use them everywhere.
          </span>
        </h1>

        {/* Subheadline */}
        <p className="mx-auto mt-8 max-w-2xl text-center text-lg leading-relaxed text-[#A1A1AA] sm:text-xl lg:text-2xl">
          Stop copy-pasting MCP configs between Claude Desktop, Cursor, VS Code,
          and every new AI tool. Conductor keeps them all in sync, automatically.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a href="#download" className="btn-primary text-base">
            <Apple className="h-5 w-5" />
            Download for macOS
          </a>
          <a
            href="https://github.com/aryabyte21/conductor"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-base"
          >
            View on GitHub
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        {/* Stats */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-base text-[#71717A]">
          <span className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#7C3AED]" />
            9 clients supported
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#7C3AED]" />
            100% local
          </span>
          <span className="flex items-center gap-2">
            <Scale className="h-3.5 w-3.5" />
            MIT License
          </span>
        </div>

        {/* Hero screenshot */}
        <div className="mt-16 sm:mt-20">
          <AppScreenshot />
        </div>
      </div>
    </section>
  );
}
