"use client";

import { useState } from "react";
import { Apple, Check, Copy, Terminal, Mail, Loader2 } from "lucide-react";

export function Download() {
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [subscribeStatus, setSubscribeStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const brewCommand = "brew install --cask conductor";

  function handleCopy() {
    navigator.clipboard.writeText(brewCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setSubscribeStatus("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setSubscribeStatus("success");
        setEmail("");
      } else {
        setSubscribeStatus("error");
      }
    } catch {
      setSubscribeStatus("error");
    }
  }

  return (
    <section
      id="download"
      className="relative border-t border-[#27272A]/50 py-24 sm:py-32"
    >
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#7C3AED]/[0.03] to-transparent" />

      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        {/* Section header */}
        <p className="text-sm font-semibold uppercase tracking-wider text-[#7C3AED]">
          Get Started
        </p>
        <h2 className="section-heading mt-3">
          Ready to simplify your MCP setup?
        </h2>
        <p className="section-subheading mx-auto">
          Download Conductor and never copy-paste a config again.
        </p>

        {/* Download button */}
        <div className="mt-10">
          <a
            href="https://github.com/nicholaschuayunzhi/conductor/releases/latest"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex text-lg"
          >
            <Apple className="h-5 w-5" />
            Download for macOS
          </a>
          <p className="mt-3 text-xs text-[#71717A]">
            v0.1.0 &middot; macOS 13+ &middot; Apple Silicon &amp; Intel &middot;
            Free &amp; open source
          </p>
        </div>

        {/* Homebrew install */}
        <div className="mx-auto mt-8 max-w-md">
          <div className="mb-2 flex items-center justify-center gap-2 text-xs text-[#71717A]">
            <Terminal className="h-3.5 w-3.5" />
            Or install with Homebrew
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-[#27272A] bg-[#111113] px-4 py-3">
            <code className="flex-1 text-left font-mono text-sm text-[#A1A1AA]">
              {brewCommand}
            </code>
            <button
              onClick={handleCopy}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#71717A] transition-colors hover:bg-[#18181B] hover:text-[#FAFAFA]"
              aria-label="Copy command"
            >
              {copied ? (
                <Check className="h-4 w-4 text-[#10B981]" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-auto my-12 h-px max-w-xs bg-[#27272A]" />

        {/* Email signup */}
        <div>
          <div className="mb-2 flex items-center justify-center gap-2 text-sm text-[#A1A1AA]">
            <Mail className="h-4 w-4" />
            Get notified about updates
          </div>
          <form
            onSubmit={handleSubscribe}
            className="mx-auto flex max-w-sm gap-2"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="flex-1 rounded-lg border border-[#27272A] bg-[#111113] px-4 py-2.5 text-sm text-[#FAFAFA] placeholder-[#71717A] outline-none transition-colors focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]"
            />
            <button
              type="submit"
              disabled={subscribeStatus === "loading"}
              className="btn-primary !px-5 !py-2.5 text-sm disabled:opacity-50"
            >
              {subscribeStatus === "loading" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Subscribe"
              )}
            </button>
          </form>
          {subscribeStatus === "success" && (
            <p className="mt-2 text-sm text-[#10B981]">
              You&apos;re subscribed! We&apos;ll keep you posted.
            </p>
          )}
          {subscribeStatus === "error" && (
            <p className="mt-2 text-sm text-[#EF4444]">
              Something went wrong. Please try again.
            </p>
          )}
          <p className="mt-2 text-xs text-[#71717A]">
            No spam, ever. Unsubscribe anytime.
          </p>
        </div>
      </div>
    </section>
  );
}
