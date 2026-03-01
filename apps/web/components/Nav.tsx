"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Github, Download } from "lucide-react";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Clients", href: "#clients" },
];

export function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-[#27272A]/50 glass">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <svg
            width="28"
            height="28"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="shrink-0"
          >
            <rect width="32" height="32" rx="8" fill="url(#conductor-nav)" />
            <circle cx="10" cy="16" r="3" fill="white" fillOpacity="0.95" />
            <path d="M13 16 C17 16 19 9 24 9" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" strokeOpacity="0.9" />
            <circle cx="24" cy="9" r="1.5" fill="white" fillOpacity="0.9" />
            <line x1="13" y1="16" x2="24" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.7" />
            <circle cx="24" cy="16" r="1.5" fill="white" fillOpacity="0.7" />
            <path d="M13 16 C17 16 19 23 24 23" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" strokeOpacity="0.5" />
            <circle cx="24" cy="23" r="1.5" fill="white" fillOpacity="0.5" />
            <defs>
              <linearGradient
                id="conductor-nav"
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
          <span className="text-lg font-semibold text-[#FAFAFA] tracking-[-0.01em]">
            Conductor
          </span>
        </Link>

        {/* Center links (desktop) */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-[#A1A1AA] transition-colors hover:text-[#FAFAFA]"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right actions (desktop) */}
        <div className="hidden items-center gap-3 md:flex">
          <a
            href="https://github.com/aryabyte21/conductor"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#A1A1AA] transition-colors hover:text-[#FAFAFA]"
          >
            <Github className="h-4 w-4" />
            GitHub
          </a>
          <a href="#download" className="btn-primary !px-4 !py-2 text-sm">
            <Download className="h-4 w-4" />
            Download
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-[#A1A1AA] transition-colors hover:bg-[#18181B] hover:text-[#FAFAFA] md:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-[#27272A]/50 bg-[#0A0A0B] px-4 pb-6 pt-4 md:hidden">
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="text-sm text-[#A1A1AA] transition-colors hover:text-[#FAFAFA]"
              >
                {link.label}
              </a>
            ))}
            <hr className="border-[#27272A]" />
            <a
              href="https://github.com/aryabyte21/conductor"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-[#A1A1AA] transition-colors hover:text-[#FAFAFA]"
            >
              <Github className="h-4 w-4" />
              GitHub
            </a>
            <a
              href="#download"
              onClick={() => setMobileOpen(false)}
              className="btn-primary w-full text-center text-sm"
            >
              <Download className="h-4 w-4" />
              Download for macOS
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
