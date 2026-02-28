import { ImageResponse } from "@vercel/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0A0A0B",
          backgroundImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(124, 58, 237, 0.15), transparent 60%)",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #7C3AED, #6D28D9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "4px",
              }}
            >
              <div
                style={{
                  width: "16px",
                  height: "28px",
                  borderRadius: "4px",
                  backgroundColor: "rgba(255, 255, 255, 0.9)",
                }}
              />
              <div
                style={{
                  width: "12px",
                  height: "20px",
                  borderRadius: "4px",
                  backgroundColor: "rgba(255, 255, 255, 0.6)",
                  marginTop: "8px",
                }}
              />
            </div>
          </div>
          <span
            style={{
              fontSize: "48px",
              fontWeight: "700",
              color: "#FAFAFA",
              letterSpacing: "-0.02em",
            }}
          >
            Conductor
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: "28px",
            color: "#A1A1AA",
            textAlign: "center",
            maxWidth: "600px",
            lineHeight: 1.4,
          }}
        >
          Configure your MCP servers once. Use them everywhere.
        </div>

        {/* Badge */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginTop: "32px",
            fontSize: "16px",
            color: "#71717A",
          }}
        >
          <span>Open Source</span>
          <span style={{ color: "#27272A" }}>/</span>
          <span>Free Forever</span>
          <span style={{ color: "#27272A" }}>/</span>
          <span>macOS</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
