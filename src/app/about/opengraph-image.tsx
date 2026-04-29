// src/app/about/opengraph-image.tsx
import { ImageResponse } from "next/og";
import { PROFILE } from "@/data/profile";

export const dynamic = "force-dynamic";
export const alt = `About ${PROFILE.name} — ${PROFILE.jobTitle}, ${PROFILE.employer.team}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function AboutOgImage() {
  const starfield = [
    "radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.6), transparent 60%)",
    "radial-gradient(1.5px 1.5px at 70% 60%, rgba(125,211,252,0.5), transparent 60%)",
    "radial-gradient(1200px 600px at 20% 100%, rgba(125,211,252,0.10), transparent 60%)",
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
          <span>{"// alexkafer.com/about"}</span>
          <span style={{ color: "#fbbf24" }}>WHO · IS · ALEX</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 28, color: "#7dd3fc", letterSpacing: 2 }}>
            ABOUT
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
            {PROFILE.name}
          </div>
          <div
            style={{
              fontSize: 32,
              color: "#9ca3af",
              borderLeft: "3px solid #7dd3fc",
              paddingLeft: 18,
              maxWidth: 1000,
            }}
          >
            {PROFILE.jobTitle} · {PROFILE.employer.team} · {PROFILE.employer.name}
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
          <span>{`// ${PROFILE.location.locality}, ${PROFILE.location.region}`}</span>
          <span>identity · canonical</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
