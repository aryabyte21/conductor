"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Layers, Server, Copy, Check, Download, ExternalLink } from "lucide-react";

interface McpServer {
  name: string;
  displayName?: string;
  description?: string;
  transport: string;
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  tags?: string[];
}

interface McpStack {
  name: string;
  description: string;
  servers: McpServer[];
  tags: string[];
  version: string;
  createdAt: string;
}

function decodeStack(hash: string): McpStack | null {
  try {
    const json = decodeURIComponent(escape(atob(hash)));
    const data = JSON.parse(json);
    if (data && data.name && Array.isArray(data.servers)) {
      return data as McpStack;
    }
    return null;
  } catch {
    return null;
  }
}

export default function SharePage() {
  const [stack, setStack] = useState<McpStack | null>(null);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) {
      setError(true);
      return;
    }
    const decoded = decodeStack(hash);
    if (!decoded) {
      setError(true);
      return;
    }
    setStack(decoded);
  }, []);

  const handleCopyJson = async () => {
    if (!stack) return;
    await navigator.clipboard.writeText(JSON.stringify(stack, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-[#7C3AED]/10 flex items-center justify-center mx-auto mb-6">
            <Layers className="w-8 h-8 text-[#7C3AED]" />
          </div>
          <h1 className="text-2xl font-bold text-[#FAFAFA] mb-2">Invalid Share Link</h1>
          <p className="text-[#A1A1AA] mb-6">
            This link doesn&apos;t contain a valid MCP stack. It may have been corrupted or is incomplete.
          </p>
          <Link href="/" className="btn-primary">
            Go to Conductor
          </Link>
        </div>
      </div>
    );
  }

  if (!stack) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="border-b border-[#27272A] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-[#FAFAFA] font-semibold">
            <Layers className="w-5 h-5 text-[#7C3AED]" />
            Conductor
          </Link>
          <Link
            href="/"
            className="text-sm text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
          >
            Download App
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 px-6 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-start gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-[#7C3AED]/10 flex items-center justify-center shrink-0">
              <Layers className="w-7 h-7 text-[#7C3AED]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#FAFAFA]">{stack.name}</h1>
              {stack.description && (
                <p className="text-[#A1A1AA] mt-1">{stack.description}</p>
              )}
              <div className="flex items-center gap-3 mt-3 text-xs text-[#71717A]">
                <span>{stack.servers.length} server{stack.servers.length !== 1 ? "s" : ""}</span>
                {stack.tags.length > 0 && (
                  <div className="flex gap-1.5">
                    {stack.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-full bg-[#27272A] text-[#A1A1AA]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Servers */}
          <div className="space-y-3 mb-8">
            {stack.servers.map((server, i) => (
              <div
                key={`${server.name}-${i}`}
                className="rounded-xl border border-[#27272A] bg-[#111113] p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#1F1F24] flex items-center justify-center shrink-0">
                    <Server className="w-4 h-4 text-[#A1A1AA]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#FAFAFA] truncate">
                      {server.displayName || server.name}
                    </p>
                    {server.description && (
                      <p className="text-xs text-[#71717A] truncate mt-0.5">
                        {server.description}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1F1F24] text-[#71717A] shrink-0">
                    {server.transport}
                  </span>
                </div>
                {server.command && (
                  <div className="mt-3 px-3 py-2 rounded-lg bg-[#0A0A0B] font-mono text-xs text-[#A1A1AA] overflow-x-auto">
                    {server.command}{server.args?.length ? ` ${server.args.join(" ")}` : ""}
                  </div>
                )}
                {server.url && (
                  <div className="mt-3 px-3 py-2 rounded-lg bg-[#0A0A0B] font-mono text-xs text-[#A1A1AA] overflow-x-auto">
                    {server.url}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleCopyJson}
              className="btn-secondary"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy JSON"}
            </button>
            <a
              href={`conductor://import-stack#${window.location.hash.slice(1)}`}
              className="btn-primary"
            >
              <Download className="w-4 h-4" />
              Open in Conductor
            </a>
          </div>

          {/* Info */}
          <div className="mt-12 rounded-xl border border-[#27272A] bg-[#111113] p-6">
            <h2 className="text-sm font-semibold text-[#FAFAFA] mb-2">What is this?</h2>
            <p className="text-sm text-[#A1A1AA] leading-relaxed">
              This is an MCP server stack shared via{" "}
              <Link href="/" className="text-[#7C3AED] hover:underline">Conductor</Link>
              . Conductor is a free, open-source config manager that lets you define your MCP
              servers once and sync them across Claude Desktop, Cursor, VS Code, Windsurf, and
              more.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 mt-3 text-sm text-[#7C3AED] hover:underline"
            >
              Learn more <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
