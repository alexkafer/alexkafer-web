// src/app/llms-full.txt/route.ts
// Full inlined content of all canonical pages, as Markdown.
// Goal: a polite LLM crawler can fetch this single file and have everything
// without rendering JavaScript.

import { PROFILE } from "@/data/profile";
import { RESUME_TIERS } from "@/data/resume";
import demosData from "@/data/demos.json";

type Demo = {
  repo: string;
  name: string;
  description: string;
  homepage: string;
  language: string;
  stars: number;
  pushedAt: string;
  hidden: boolean;
};

export const dynamic = "force-static";

export async function GET() {
  const site = PROFILE.siteUrl;

  const demos = (demosData as Demo[])
    .filter((d) => !d.hidden)
    .sort((a, b) => (b.pushedAt > a.pushedAt ? 1 : -1));

  const lines: string[] = [];

  lines.push(`# ${PROFILE.name}`);
  lines.push("");
  lines.push(`> ${PROFILE.summary}`);
  lines.push("");
  lines.push(`Source of truth: ${site}`);
  lines.push("");

  // About
  lines.push("## About");
  lines.push("");
  lines.push(
    `**${PROFILE.jobTitle}** · ${PROFILE.employer.team} · ${PROFILE.employer.name}`,
  );
  lines.push(
    `Location: ${PROFILE.location.locality}, ${PROFILE.location.region}, ${PROFILE.location.country}`,
  );
  lines.push("");
  lines.push(PROFILE.bio);
  lines.push("");
  lines.push("### Focus areas");
  lines.push("");
  for (const topic of PROFILE.knowsAbout) {
    lines.push(`- ${topic}`);
  }
  lines.push("");
  lines.push("### Links");
  lines.push("");
  for (const l of PROFILE.links) {
    lines.push(`- ${l.label}: ${l.url}`);
  }
  lines.push("");

  // Résumé
  lines.push("## Résumé");
  lines.push("");
  lines.push(`Canonical URL: ${site}/resume`);
  lines.push(`Machine-readable: ${site}/resume.json (JSON Resume schema)`);
  lines.push("");
  for (const tier of RESUME_TIERS) {
    const tierLabel = tier.label.replace(/^\/\/\s*/, "");
    lines.push(`### ${tierLabel}`);
    lines.push("");
    for (const entry of tier.entries) {
      lines.push(`- **${entry.name}** — ${entry.role}`);
      if (entry.awards && entry.awards.length > 0) {
        for (const award of entry.awards) {
          lines.push(`  - Award: ${award}`);
        }
      }
    }
    lines.push("");
  }

  // Demos
  lines.push("## Demos");
  lines.push("");
  lines.push(`Listed on the homepage at ${site}/#demos.`);
  lines.push("");
  for (const d of demos) {
    const repoUrl = `https://github.com/${d.repo}`;
    const desc = d.description?.trim() || "(no description)";
    lines.push(`- **${d.name}** (${d.language || "—"}) — ${desc}`);
    lines.push(`  - Repo: ${repoUrl}`);
    if (d.homepage) lines.push(`  - Live: ${d.homepage}`);
  }
  lines.push("");

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
