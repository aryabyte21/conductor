import { NextResponse } from "next/server";

interface GitHubRelease {
  assets: {
    download_count: number;
  }[];
}

export async function GET() {
  try {
    const res = await fetch(
      "https://api.github.com/repos/aryabyte21/conductor/releases",
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          ...(process.env.GITHUB_TOKEN
            ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
            : {}),
        },
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    );

    if (!res.ok) {
      console.warn(`GitHub API error: ${res.status} ${res.statusText}`);
      return NextResponse.json(
        { count: 0, formatted: "0" },
        { status: 200 }
      );
    }

    const releases: GitHubRelease[] = await res.json();

    const count = releases.reduce((total, release) => {
      return (
        total +
        release.assets.reduce((assetTotal, asset) => {
          return assetTotal + asset.download_count;
        }, 0)
      );
    }, 0);

    const formatted = formatCount(count);

    return NextResponse.json(
      { count, formatted },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
        },
      }
    );
  } catch (e) {
    console.error("Failed to fetch download count:", e);
    return NextResponse.json(
      { count: 0, formatted: "0" },
      { status: 200 }
    );
  }
}

function formatCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}k`;
  }
  return count.toString();
}
