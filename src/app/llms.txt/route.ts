// src/app/llms.txt/route.ts
// llms.txt link index per https://llmstxt.org/
// Goal: give LLM crawlers a concise, machine-friendly map of the site.

import { PROFILE } from "@/data/profile";

export const dynamic = "force-static";

export async function GET() {
  const site = PROFILE.siteUrl;
  const body = [
    `# ${PROFILE.name}`,
    "",
    `> ${PROFILE.summary}`,
    "",
    "## About",
    `- [About](${site}/about): Bio, focus areas, links`,
    "",
    "## Résumé",
    `- [Résumé](${site}/resume): Work history, education, internships`,
    `- [Résumé (JSON Resume schema)](${site}/resume.json): Machine-readable JSON export`,
    "",
    "## Demos",
    `- [Demos](${site}/#demos): Curated public side projects and prototypes`,
    "",
    "## Contact",
    ...PROFILE.links.map((l) => `- [${l.label}](${l.url})`),
    "",
    "## Full content",
    `- [llms-full.txt](${site}/llms-full.txt): Full inlined content of all canonical pages`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
