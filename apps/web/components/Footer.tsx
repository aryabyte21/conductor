import { Github, Twitter } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-[#27272A]/50 py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          {/* Logo + tagline */}
          <div className="flex items-center gap-3">
            <svg
              width="24"
              height="24"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="shrink-0"
            >
              <rect width="32" height="32" rx="8" fill="url(#conductor-footer)" />
              <circle cx="10" cy="16" r="3" fill="white" fillOpacity="0.95" />
              <path d="M13 16 C17 16 19 9 24 9" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" strokeOpacity="0.9" />
              <circle cx="24" cy="9" r="1.5" fill="white" fillOpacity="0.9" />
              <line x1="13" y1="16" x2="24" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.7" />
              <circle cx="24" cy="16" r="1.5" fill="white" fillOpacity="0.7" />
              <path d="M13 16 C17 16 19 23 24 23" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" strokeOpacity="0.5" />
              <circle cx="24" cy="23" r="1.5" fill="white" fillOpacity="0.5" />
              <defs>
                <linearGradient
                  id="conductor-footer"
                  x1="0"
                  y1="0"
                  x2="32"
                  y2="32"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#7C3AED" />
                  <stop offset="1" stopColor="#6D28D9" />
                </linearGradient>
              </defs>
            </svg>
            <div>
              <span className="text-sm font-semibold text-[#FAFAFA]">
                Conductor
              </span>
              <p className="text-xs text-[#71717A]">
                Open source MCP config manager
              </p>
            </div>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <a
              href="https://github.com/aryabyte21/conductor"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-[#71717A] transition-colors hover:text-[#FAFAFA]"
            >
              <Github className="h-4 w-4" />
              GitHub
            </a>
            <a
              href="https://twitter.com/conductor_dev"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-[#71717A] transition-colors hover:text-[#FAFAFA]"
            >
              <Twitter className="h-4 w-4" />
              Twitter
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 border-t border-[#27272A]/50 pt-6 text-center">
          <p className="text-xs text-[#71717A]">
            Released under the{" "}
            <a
              href="https://github.com/aryabyte21/conductor/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#A1A1AA] underline underline-offset-2 hover:text-[#FAFAFA]"
            >
              MIT License
            </a>
            . Built with care for the MCP community.
          </p>
        </div>
      </div>
    </footer>
  );
}
