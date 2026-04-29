#!/usr/bin/env node
// Generates src/data/build-info.json at build time. Captures the current
// commit SHA, build timestamp, and the last N commits (with relative
// metadata) so the /status page can render a deployment log without
// needing git access at runtime — which matters because the production
// runtime is Cloudflare Workers, which has no shell or git.

import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const OUT = "src/data/build-info.json";
const N_COMMITS = 25;

function safe(cmd, fallback = "") {
  try {
    return execSync(cmd, { encoding: "utf8" }).trim();
  } catch {
    return fallback;
  }
}

const sha = safe("git rev-parse HEAD", "dev");
const shortSha = safe("git rev-parse --short HEAD", "dev");
const branch = safe("git rev-parse --abbrev-ref HEAD", "main");
const buildTime = new Date().toISOString();

// One commit per line: SHA<TAB>ISO date<TAB>author<TAB>subject
const raw = safe(
  `git log -n ${N_COMMITS} --pretty=format:"%h%x09%aI%x09%an%x09%s"`,
  "",
);
const commits = raw
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const [sha, date, author, ...rest] = line.split("\t");
    return { sha, date, author, subject: rest.join("\t") };
  });

// Approximate "deployment days" for the heatmap: distinct UTC days that
// had at least one commit, over the last 90 days. Real deployment data
// would come from Cloudflare's API, but for a personal site one commit
// ≈ one deploy is a reasonable proxy.
const deploysByDay = {};
const dayLog = safe(
  `git log --since="90 days ago" --pretty=format:"%aI"`,
  "",
);
dayLog
  .split("\n")
  .filter(Boolean)
  .forEach((iso) => {
    const day = iso.slice(0, 10);
    deploysByDay[day] = (deploysByDay[day] ?? 0) + 1;
  });

const totalCommits = Number(safe("git rev-list --count HEAD", "0"));
const firstCommitDate = safe(
  'git log --reverse --pretty=format:"%aI" | head -1',
  "",
);

const info = {
  sha,
  shortSha,
  branch,
  buildTime,
  commits,
  deploysByDay,
  totalCommits,
  firstCommitDate,
  repository: "https://github.com/alexkafer/alexkafer-web",
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(info, null, 2));
console.log(
  `[build-info] wrote ${OUT} — sha=${shortSha} commits=${commits.length} days=${Object.keys(deploysByDay).length}`,
);
