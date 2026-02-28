import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Conductor — MCP Config Manager for AI Developers",
  description:
    "Configure your MCP servers once, use them everywhere. Conductor is the open-source config manager that syncs your Model Context Protocol servers across Claude Desktop, Cursor, VS Code, Windsurf, and more.",
  keywords: [
    "MCP",
    "Model Context Protocol",
    "config manager",
    "Claude Desktop",
    "Cursor",
    "VS Code",
    "AI developer tools",
    "MCP servers",
    "developer tools",
    "macOS",
    "open source",
  ],
  authors: [{ name: "Conductor" }],
  creator: "Conductor",
  metadataBase: new URL("https://conductor.dev"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://conductor.dev",
    siteName: "Conductor",
    title: "Conductor — MCP Config Manager for AI Developers",
    description:
      "Configure your MCP servers once, use them everywhere. The open-source MCP config manager for AI developers.",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "Conductor — MCP Config Manager",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Conductor — MCP Config Manager for AI Developers",
    description:
      "Configure your MCP servers once, use them everywhere. Open source, free forever.",
    images: ["/api/og"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${jakarta.variable} font-sans bg-[#0A0A0B] text-[#FAFAFA] antialiased`}
      >
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
