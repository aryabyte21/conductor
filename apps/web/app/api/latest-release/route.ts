import { NextResponse } from "next/server";

interface GitHubAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

interface GitHubRelease {
  tag_name: string;
  html_url: string;
  assets: GitHubAsset[];
}

export async function GET() {
  try {
    const res = await fetch(
      "https://api.github.com/repos/aryabyte21/conductor/releases/latest",
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          ...(process.env.GITHUB_TOKEN
            ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
            : {}),
        },
        next: { revalidate: 300 }, // Cache for 5 minutes
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { version: null, arm64: null, x64: null, release: null },
        { status: 200 }
      );
    }

    const release: GitHubRelease = await res.json();

    const arm64 = release.assets.find(
      (a) => a.name.endsWith(".dmg") && /aarch64|arm64/i.test(a.name)
    );
    const x64 = release.assets.find(
      (a) => a.name.endsWith(".dmg") && /x86_64|x64|intel/i.test(a.name)
    );

    return NextResponse.json(
      {
        version: release.tag_name,
        arm64: arm64?.browser_download_url ?? null,
        x64: x64?.browser_download_url ?? null,
        release: release.html_url,
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { version: null, arm64: null, x64: null, release: null },
      { status: 200 }
    );
  }
}
