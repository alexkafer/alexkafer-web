// src/app/robots.ts
import type { MetadataRoute } from "next";
import { PROFILE } from "@/data/profile";

// We want LLM ingestion. Explicitly allow the major bots so we don't
// inherit any default-block behavior from CDNs or future site infrastructure.
const LLM_BOTS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "CCBot",
  "Applebot-Extended",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      ...LLM_BOTS.map((ua) => ({ userAgent: ua, allow: "/" })),
    ],
    sitemap: `${PROFILE.siteUrl}/sitemap.xml`,
    host: new URL(PROFILE.siteUrl).host,
  };
}
