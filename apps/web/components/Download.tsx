"use client";

import { useState } from "react";
import { Apple, Mail, Loader2 } from "lucide-react";

export function Download() {
  const [email, setEmail] = useState("");
  const [subscribeStatus, setSubscribeStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

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
        <p className="text-base font-semibold uppercase tracking-wider text-[#7C3AED]">
          Get Started
        </p>
        <h2 className="section-heading mt-3">
          Ready to simplify your MCP setup?
        </h2>
        <p className="section-subheading mx-auto">
          Download Conductor and never copy-paste a config again.
        </p>

        {/* Download buttons */}
        <div className="mt-10">
          <a
            href="https://github.com/aryabyte21/conductor/releases/latest"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex text-lg"
          >
            <Apple className="h-5 w-5" />
            Download for macOS
          </a>

          <div className="mt-4 flex items-center justify-center gap-3 text-sm">
            <a
              href="https://github.com/aryabyte21/conductor/releases/latest"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#A1A1AA] underline underline-offset-2 transition-colors hover:text-[#FAFAFA]"
            >
              Apple Silicon (M1+)
            </a>
            <span className="text-[#3F3F46]">&middot;</span>
            <a
              href="https://github.com/aryabyte21/conductor/releases/latest"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#A1A1AA] underline underline-offset-2 transition-colors hover:text-[#FAFAFA]"
            >
              Intel
            </a>
          </div>

          <p className="mt-3 text-sm text-[#71717A]">
            macOS 10.15+ &middot; Free &amp; open source
          </p>

          {/* macOS unsigned note */}
          <p className="mx-auto mt-4 max-w-md text-xs leading-relaxed text-[#52525B]">
            First launch: right-click the app &rarr; Open to bypass macOS Gatekeeper.
            This is a standard step for open-source apps.
          </p>
        </div>

        {/* Divider */}
        <div className="mx-auto my-12 h-px max-w-xs bg-[#27272A]" />

        {/* Email signup */}
        <div>
          <div className="mb-3 flex items-center justify-center gap-2 text-base text-[#A1A1AA]">
            <Mail className="h-5 w-5" />
            Get notified about updates
          </div>
          <form
            onSubmit={handleSubscribe}
            className="mx-auto flex max-w-md gap-2"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="flex-1 rounded-lg border border-[#27272A] bg-[#111113] px-4 py-3 text-base text-[#FAFAFA] placeholder-[#71717A] outline-none transition-colors focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]"
            />
            <button
              type="submit"
              disabled={subscribeStatus === "loading"}
              className="btn-primary !px-6 !py-3 text-base disabled:opacity-50"
            >
              {subscribeStatus === "loading" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Subscribe"
              )}
            </button>
          </form>
          {subscribeStatus === "success" && (
            <p className="mt-3 text-base text-[#10B981]">
              You&apos;re subscribed! We&apos;ll keep you posted.
            </p>
          )}
          {subscribeStatus === "error" && (
            <p className="mt-3 text-base text-[#EF4444]">
              Something went wrong. Please try again.
            </p>
          )}
          <p className="mt-3 text-sm text-[#71717A]">
            No spam, ever. Unsubscribe anytime.
          </p>
        </div>
      </div>
    </section>
  );
}
