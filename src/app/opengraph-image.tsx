import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt =
  "Alex Kafer · Senior PM, Xbox Platform · operating at billions/day";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  // Subtle starfield via stacked radial gradients.
  const starfield = [
    "radial-gradient(1px 1px at 12% 18%, rgba(255,255,255,0.7), transparent 60%)",
    "radial-gradient(1px 1px at 78% 22%, rgba(255,255,255,0.5), transparent 60%)",
    "radial-gradient(1.5px 1.5px at 35% 70%, rgba(255,255,255,0.6), transparent 60%)",
    "radial-gradient(1px 1px at 60% 55%, rgba(255,255,255,0.4), transparent 60%)",
    "radial-gradient(1px 1px at 88% 80%, rgba(255,255,255,0.5), transparent 60%)",
    "radial-gradient(2px 2px at 22% 45%, rgba(125,211,252,0.55), transparent 60%)",
    "radial-gradient(1.5px 1.5px at 70% 35%, rgba(125,211,252,0.45), transparent 60%)",
    "radial-gradient(1px 1px at 50% 85%, rgba(125,211,252,0.4), transparent 60%)",
    "radial-gradient(1200px 600px at 80% 0%, rgba(125,211,252,0.10), transparent 60%)",
    "linear-gradient(180deg, #050510 0%, #0a0e1a 100%)",
  ].join(", ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          backgroundImage: starfield,
          color: "#e6edf3",
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 22,
            color: "#7dd3fc",
            letterSpacing: 2,
          }}
        >
          <span>{"// alexkafer.com"}</span>
          <span style={{ color: "#fbbf24" }}>STATUS · NOMINAL</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 28, color: "#7dd3fc", letterSpacing: 2 }}>
            ALEX KAFER
          </div>
          <div
            style={{
              fontSize: 64,
              fontWeight: 600,
              lineHeight: 1.1,
              color: "#e6edf3",
              maxWidth: 1000,
            }}
          >
            Senior PM, Xbox Platform
          </div>
          <div
            style={{
              fontSize: 36,
              color: "#9ca3af",
              borderLeft: "3px solid #7dd3fc",
              paddingLeft: 18,
            }}
          >
            operating at billions/day
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 20,
            color: "#6b7280",
          }}
        >
          <span>{"// Seattle, WA"}</span>
          <span>req/s 8.2k · p99 42ms · uptime 99.9%</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
