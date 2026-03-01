"use client";

import { useState, useEffect } from "react";
import { Apple, Mail, Loader2, Download as DownloadIcon, Terminal, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { useDownload } from "@/lib/use-download";

function DownloadCount() {
  const [count, setCount] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/download-count")
      .then((r) => r.json())
      .then((data) => {
        if (data.count > 0) setCount(data.formatted);
      })
      .catch(() => {});
  }, []);

  if (!count) return null;

  return (
    <>
      {" "}&middot;{" "}
      <span className="inline-flex items-center gap-1">
        <DownloadIcon className="inline h-3 w-3" />
        {count} downloads
      </span>
    </>
  );
}

const INSTALL_CMD = "curl -fsSL https://conductor-mcp.vercel.app/install.sh | sh";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleCopy}
      className="shrink-0 rounded p-1 text-[#71717A] transition-colors hover:bg-[#27272A] hover:text-[#FAFAFA]"
      aria-label="Copy to clipboard"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-[#10B981]" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}


export function Download() {
  const [email, setEmail] = useState("");
  const [showManual, setShowManual] = useState(false);
  const { arch, archLabel, release, fallbackUrl } = useDownload();

  const [subscribeStatus, setSubscribeStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setSubscribeStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setSubscribeStatus("success");
        setEmail("");
      } else if (res.status === 503) {
        setSubscribeStatus("error");
        setErrorMsg("Subscriptions aren't set up yet. Star us on GitHub to stay updated!");
      } else if (res.status === 429) {
        setSubscribeStatus("error");
        setErrorMsg("Too many requests. Please try again later.");
      } else {
        setSubscribeStatus("error");
        setErrorMsg("Something went wrong. Please try again.");
      }
    } catch {
      setSubscribeStatus("error");
      setErrorMsg("Something went wrong. Please try again.");
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

        {/* Install command — primary */}
        <div className="mx-auto mt-10 max-w-lg">
          <div className="rounded-lg border border-[#27272A] bg-[#111113] p-4">
            <div className="mb-2 flex items-center gap-2 text-xs text-[#A1A1AA]">
              <Terminal className="h-3.5 w-3.5 text-[#7C3AED]" />
              Install with one command (recommended):
            </div>
            <div className="flex items-start gap-2 rounded-md bg-[#0A0A0B] px-3 py-2.5">
              <code className="min-w-0 flex-1 break-all font-mono text-xs leading-relaxed text-[#FAFAFA]">
                {INSTALL_CMD}
              </code>
              <CopyButton text={INSTALL_CMD} />
            </div>
            <p className="mt-2.5 text-[11px] leading-relaxed text-[#52525B]">
              Open Terminal and paste this command. It auto-detects your chip (Apple Silicon / Intel),
              downloads the latest version, installs to /Applications, and removes the macOS quarantine
              flag so the app opens without any &ldquo;damaged&rdquo; errors.
            </p>
          </div>
        </div>

        {/* Manual DMG download — secondary */}
        <div className="mt-6">
          <p className="mb-3 text-sm text-[#71717A]">Or download the DMG manually:</p>
          <div className="flex items-center justify-center gap-3 text-sm">
            <a
              href={release.arm64 ?? fallbackUrl}
              className={`underline underline-offset-2 transition-colors hover:text-[#FAFAFA] ${
                arch === "arm64" || !arch ? "text-[#FAFAFA]" : "text-[#A1A1AA]"
              }`}
            >
              <Apple className="mr-1 inline h-3.5 w-3.5" />
              Apple Silicon (M1+)
            </a>
            <span className="text-[#3F3F46]">&middot;</span>
            <a
              href={release.x64 ?? fallbackUrl}
              className={`underline underline-offset-2 transition-colors hover:text-[#FAFAFA] ${
                arch === "x64" ? "text-[#FAFAFA]" : "text-[#A1A1AA]"
              }`}
            >
              Intel
            </a>
          </div>

          {arch && (
            <p className="mt-2 text-xs text-[#7C3AED]">
              Detected: {archLabel}
              {release.version && <span className="ml-1 text-[#52525B]">({release.version})</span>}
            </p>
          )}

          <p className="mt-3 text-sm text-[#71717A]">
            macOS 10.15+ &middot; Free &amp; open source
            <DownloadCount />
          </p>
        </div>

        {/* Gatekeeper fix for manual DMG users */}
        <div className="mx-auto mt-4 max-w-lg">
          <button
            onClick={() => setShowManual(!showManual)}
            className="mx-auto flex items-center gap-1.5 text-xs text-[#52525B] transition-colors hover:text-[#A1A1AA]"
          >
            Downloaded DMG and getting a &quot;damaged&quot; error?
            {showManual ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {showManual && (
            <div className="mt-3 rounded-lg border border-[#27272A] bg-[#111113] p-4 text-left text-sm">
              <p className="mb-3 text-xs text-[#A1A1AA]">
                Normal for open-source apps without a $99/yr Apple Developer certificate.
                After dragging the app to Applications, run:
              </p>
              <div className="flex items-center gap-2 rounded-md bg-[#0A0A0B] px-3 py-2">
                <code className="flex-1 font-mono text-xs text-[#FAFAFA]">
                  xattr -cr /Applications/Conductor.app
                </code>
                <CopyButton text="xattr -cr /Applications/Conductor.app" />
              </div>
              <p className="mt-2 text-xs text-[#52525B]">
                Then open the app normally. You only need to do this once.
              </p>
            </div>
          )}
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
              {errorMsg}
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
