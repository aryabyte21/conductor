"use client";

import { useState, useEffect } from "react";
import { Apple, Mail, Loader2, Download as DownloadIcon, Terminal, ChevronDown, ChevronUp } from "lucide-react";
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

function GatekeeperGuide() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mx-auto mt-6 max-w-lg">
      <button
        onClick={() => setOpen(!open)}
        className="mx-auto flex items-center gap-1.5 text-xs text-[#71717A] transition-colors hover:text-[#A1A1AA]"
      >
        <Terminal className="h-3 w-3" />
        macOS says &quot;damaged&quot; or &quot;can&apos;t be opened&quot;?
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {open && (
        <div className="mt-3 rounded-lg border border-[#27272A] bg-[#111113] p-4 text-left text-sm">
          <p className="mb-3 text-[#A1A1AA]">
            This happens because Conductor isn&apos;t signed with an Apple Developer certificate yet (it&apos;s $99/year).
            Totally normal for open-source apps. Here&apos;s the fix:
          </p>

          <div className="mb-3">
            <p className="mb-1.5 text-xs font-medium text-[#FAFAFA]">After mounting the DMG and dragging to Applications:</p>
            <div className="rounded-md bg-[#0A0A0B] px-3 py-2 font-mono text-xs text-[#A1A1AA]">
              <span className="select-none text-[#52525B]">$ </span>
              <span className="text-[#FAFAFA]">xattr -cr /Applications/Conductor.app</span>
            </div>
          </div>

          <p className="mb-3 text-[#A1A1AA]">
            Then double-click the app as normal. This removes the macOS quarantine flag — you only need to do it once.
          </p>

          <div className="rounded-md border border-[#27272A]/50 bg-[#18181B] px-3 py-2 text-xs text-[#71717A]">
            <span className="text-[#A1A1AA]">What does this do?</span>{" "}
            <code className="text-[#8B5CF6]">xattr -cr</code> removes the extended attribute macOS adds to files downloaded from the internet.
            It&apos;s the same thing that happens when you sign an app with an Apple certificate — it just tells macOS &quot;this is safe to open&quot;.
          </div>
        </div>
      )}
    </div>
  );
}

export function Download() {
  const [email, setEmail] = useState("");
  const { arch, archLabel, release, dmgUrl, fallbackUrl } = useDownload();

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

        {/* Download buttons */}
        <div className="mt-10">
          <a
            href={dmgUrl}
            className="btn-primary inline-flex text-lg"
          >
            <Apple className="h-5 w-5" />
            Download for macOS
            {release.version && (
              <span className="ml-1 text-sm opacity-70">{release.version}</span>
            )}
          </a>

          {/* Detected arch badge */}
          {arch && (
            <p className="mt-2 text-xs text-[#7C3AED]">
              Detected: {archLabel}
            </p>
          )}

          <div className="mt-3 flex items-center justify-center gap-3 text-sm">
            <a
              href={release.arm64 ?? fallbackUrl}
              className={`underline underline-offset-2 transition-colors hover:text-[#FAFAFA] ${
                arch === "arm64" || !arch ? "text-[#FAFAFA]" : "text-[#A1A1AA]"
              }`}
            >
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

          <p className="mt-3 text-sm text-[#71717A]">
            macOS 10.15+ &middot; Free &amp; open source
            <DownloadCount />
          </p>

          {/* Gatekeeper fix guide */}
          <GatekeeperGuide />
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
