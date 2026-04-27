#!/usr/bin/env node
// Refresh src/data/demos.json from GitHub.
//
// Append-only / merge-preserving:
//   - For repos ALREADY present (matched by `repo`), the existing entry is
//     left completely untouched. Hand-edits to name, description, homepage,
//     hidden, stars, etc. all survive.
//   - For repos NOT present, a new entry is appended with GitHub-derived
//     defaults and `hidden: false`.
//   - Repos that no longer exist on GitHub are kept (you may have intentionally
//     curated them); remove them by hand if you want them gone.
//
// Run via `npm run demos:refresh` or the "Refresh demos from GitHub" VS Code
// task.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const USER = "alexkafer";
const __dirname = dirname(fileURLToPath(import.meta.url));
const DEMOS_PATH = resolve(__dirname, "..", "src", "data", "demos.json");

async function fetchAllRepos(user) {
  const all = [];
  let page = 1;
  for (;;) {
    const url = `https://api.github.com/users/${user}/repos?per_page=100&sort=pushed&page=${page}`;
    const res = await fetch(url, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) {
      throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
    }
    const batch = await res.json();
    all.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }
  return all.filter((r) => !r.fork && !r.archived);
}

function toEntry(r) {
  return {
    repo: r.full_name,
    name: r.name,
    description: r.description ?? "",
    homepage: r.homepage ?? "",
    language: r.language ?? "",
    stars: r.stargazers_count ?? 0,
    pushedAt: r.pushed_at ?? "",
    hidden: false,
  };
}

async function main() {
  const existing = existsSync(DEMOS_PATH)
    ? JSON.parse(readFileSync(DEMOS_PATH, "utf8"))
    : [];

  const seen = new Set(existing.map((e) => e.repo));
  const repos = await fetchAllRepos(USER);

  let added = 0;
  for (const r of repos) {
    if (seen.has(r.full_name)) continue;
    existing.push(toEntry(r));
    seen.add(r.full_name);
    added += 1;
  }

  writeFileSync(DEMOS_PATH, JSON.stringify(existing, null, 2) + "\n", "utf8");
  console.log(
    `demos.json: ${added} new, ${existing.length} total (existing entries preserved).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
