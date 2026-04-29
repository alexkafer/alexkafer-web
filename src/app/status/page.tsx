// src/app/status/page.tsx
//
// Mission-control style operational dashboard for alexkafer.com.
//
// Server-rendered. All data either comes from the build-info.json snapshot
// (committed at build time by scripts/generate-build-info.mjs) or is
// statically described here. There's no runtime telemetry pipeline behind
// this — it's a transparency page, not a real status oracle. If anything
// genuinely breaks, you'd find out from monitoring on Cloudflare's side
// well before this page would.

import type { Metadata } from "next";
import Link from "next/link";
import buildInfo from "@/data/build-info.json";
import { defaultMetadata } from "@/lib/seo";

export const metadata: Metadata = defaultMetadata({
  path: "/status",
  title: "Systems Status",
  description:
    "Operational dashboard for alexkafer.com — hosting stack, deployment log, and build telemetry.",
});

const STACK = [
  {
    label: "EDGE RUNTIME",
    value: "Cloudflare Workers",
    detail: "Global anycast across 300+ PoPs. ~10ms p50 from most regions.",
  },
  {
    label: "FRAMEWORK",
    value: "Next.js 14 + OpenNext",
    detail: "App Router, RSC, deployed via @opennextjs/cloudflare adapter.",
  },
  {
    label: "DATABASE",
    value: "Cloudflare D1",
    detail: "SQLite at the edge for the live A/B experiment counters.",
  },
  {
    label: "ASSETS",
    value: "Cloudflare R2 + Workers KV",
    detail: "Static media + cached page artifacts.",
  },
  {
    label: "DNS / TLS",
    value: "Cloudflare",
    detail: "Automatic HTTPS, HTTP/3, edge caching with stale-while-revalidate.",
  },
  {
    label: "OBSERVABILITY",
    value: "Workers Analytics",
    detail: "Request volume, error rates, p99 latency.",
  },
] as const;

type DeploysByDay = Record<string, number>;

function buildHeatmap(deploysByDay: DeploysByDay) {
  const days: { date: string; count: number }[] = [];
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  for (let i = 89; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(now.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, count: deploysByDay[key] ?? 0 });
  }
  return days;
}

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = now - then;
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 48) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 14) return `${day}d ago`;
  const wk = Math.round(day / 7);
  if (wk < 8) return `${wk}w ago`;
  const mo = Math.round(day / 30);
  return `${mo}mo ago`;
}

function classifyCommit(subject: string): {
  kind: string;
  color: string;
} {
  const m = /^(\w+)(\([^)]+\))?:/.exec(subject);
  const kind = m?.[1]?.toLowerCase() ?? "misc";
  const palette: Record<string, string> = {
    feat: "text-emerald-400",
    fix: "text-amber",
    perf: "text-cyan",
    refactor: "text-cyan/70",
    chore: "text-mute-500",
    docs: "text-mute-500",
    style: "text-mute-500",
    copy: "text-mute-500",
    revert: "text-rose-400",
    seo: "text-cyan/70",
  };
  return { kind: kind.toUpperCase(), color: palette[kind] ?? "text-cyan" };
}

export default function StatusPage() {
  const days = buildHeatmap(buildInfo.deploysByDay as DeploysByDay);
  const deployDays = days.filter((d) => d.count > 0).length;
  const totalDeploys = days.reduce((sum, d) => sum + d.count, 0);
  const lastCommit = buildInfo.commits[0];
  const lastDeployRelative = lastCommit
    ? formatRelativeTime(lastCommit.date)
    : "—";
  const buildRelative = formatRelativeTime(buildInfo.buildTime);
  const daysSinceFirst = buildInfo.firstCommitDate
    ? Math.floor(
        (Date.now() - new Date(buildInfo.firstCommitDate).getTime()) /
          86_400_000,
      )
    : 0;

  return (
    <main
      id="main-content"
      className="mx-auto max-w-5xl px-6 py-20 font-mono text-mute-100 md:px-10"
    >
      {/* HEADER STRIP */}
      <header className="border border-cyan/20 bg-void-800/40 backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-cyan/10 px-4 py-2 text-[10px] uppercase tracking-widest text-cyan/70">
          <span>MISSION CONTROL · alexkafer.com</span>
          <span className="text-mute-500">T+ {daysSinceFirst}d SINCE FIRST COMMIT</span>
        </div>
        <div className="grid gap-4 px-4 py-6 sm:grid-cols-[auto_1fr_auto] sm:items-center">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="relative inline-flex h-3 w-3"
              title="All systems nominal"
            >
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/70 opacity-60" />
              <span className="relative inline-block h-3 w-3 rounded-full bg-emerald-500" />
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-mute-100 sm:text-3xl">
              ALL SYSTEMS NOMINAL
            </h1>
          </div>
          <p className="text-pretty text-sm leading-relaxed text-mute-300">
            Static-rendered Next.js 14 app deployed to Cloudflare&apos;s edge
            via OpenNext. Most pages serve from cache in under 50&nbsp;ms
            globally. The A/B experiment in{" "}
            <Link href="/#lab" className="text-cyan hover:underline">
              // 04 LAB
            </Link>{" "}
            writes to a Cloudflare D1 SQLite database living in the same
            data centers.
          </p>
          <div className="flex justify-end">
            <Link
              href="/"
              className="inline-flex items-center gap-1 border border-cyan/30 px-3 py-1.5 text-[10px] uppercase tracking-widest text-cyan/80 hover:border-cyan/60 hover:bg-cyan/5 hover:text-cyan"
            >
              ← RETURN TO BRIDGE
            </Link>
          </div>
        </div>
      </header>

      {/* TELEMETRY ROW */}
      <section
        aria-label="Telemetry"
        className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <Stat label="UPTIME (30d)" value="100.0%" hint="Cloudflare SLA: 99.99%" />
        <Stat
          label="DEPLOY FREQ (90d)"
          value={`${deployDays}d`}
          hint={`${totalDeploys} commits shipped`}
        />
        <Stat
          label="LAST DEPLOY"
          value={lastDeployRelative}
          hint={lastCommit?.sha ?? "—"}
        />
        <Stat
          label="BUILD"
          value={buildInfo.shortSha}
          hint={`${buildInfo.branch} · ${buildRelative}`}
        />
      </section>

      {/* INFRASTRUCTURE PANEL */}
      <section
        aria-labelledby="infra-h"
        className="mt-10 border border-cyan/20 bg-void-800/30"
      >
        <PanelHeader id="infra-h" code="01" title="INFRASTRUCTURE" />
        <div className="grid gap-px bg-cyan/10 sm:grid-cols-2 lg:grid-cols-3">
          {STACK.map((s) => (
            <div key={s.label} className="bg-void-800/60 p-4">
              <p className="text-[10px] uppercase tracking-widest text-cyan/60">
                {s.label}
              </p>
              <p className="mt-1 text-sm font-semibold text-mute-100">
                {s.value}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-mute-500">
                {s.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* DEPLOYMENT HEATMAP */}
      <section
        aria-labelledby="heatmap-h"
        className="mt-10 border border-cyan/20 bg-void-800/30"
      >
        <PanelHeader
          id="heatmap-h"
          code="02"
          title="DEPLOYMENT HEATMAP · 90D"
        />
        <div className="px-4 py-6">
          <DeployHeatmap days={days} />
          <div className="mt-4 flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-widest text-mute-500">
            <span>LESS</span>
            <span className="block h-3 w-3 bg-mute-700/40" />
            <span className="block h-3 w-3 bg-emerald-500/30" />
            <span className="block h-3 w-3 bg-emerald-500/60" />
            <span className="block h-3 w-3 bg-emerald-500" />
            <span>MORE</span>
            <span className="ml-4 text-cyan/60">
              SOURCE: GIT COMMIT HISTORY (~1 commit ≈ 1 deploy)
            </span>
          </div>
        </div>
      </section>

      {/* DEPLOYMENT LOG */}
      <section
        aria-labelledby="log-h"
        className="mt-10 border border-cyan/20 bg-void-800/30"
      >
        <PanelHeader
          id="log-h"
          code="03"
          title={`DEPLOYMENT LOG · LAST ${buildInfo.commits.length}`}
        />
        <ol className="divide-y divide-cyan/10">
          {buildInfo.commits.map((c, i) => {
            const { kind, color } = classifyCommit(c.subject);
            return (
              <li
                key={c.sha}
                className="grid grid-cols-[3rem_5rem_5rem_1fr] items-baseline gap-3 px-4 py-2.5 text-xs hover:bg-cyan/[0.03] sm:grid-cols-[3.5rem_6rem_6rem_1fr_auto]"
              >
                <span className="text-mute-500">
                  #{String(buildInfo.commits.length - i).padStart(3, "0")}
                </span>
                <a
                  href={`${buildInfo.repository}/commit/${c.sha}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan hover:underline"
                >
                  {c.sha}
                </a>
                <span
                  className={`text-[10px] uppercase tracking-widest ${color}`}
                >
                  {kind}
                </span>
                <span className="truncate text-mute-200" title={c.subject}>
                  {c.subject}
                </span>
                <span
                  className="hidden text-[10px] uppercase tracking-wider text-mute-500 sm:inline"
                  title={c.date}
                >
                  {formatRelativeTime(c.date)}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      {/* BUILD METADATA */}
      <section
        aria-labelledby="build-h"
        className="mt-10 border border-cyan/20 bg-void-800/30"
      >
        <PanelHeader id="build-h" code="04" title="BUILD METADATA" />
        <dl className="grid gap-px bg-cyan/10 sm:grid-cols-2">
          <Field
            term="COMMIT"
            value={
              <a
                href={`${buildInfo.repository}/commit/${buildInfo.sha}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan hover:underline"
              >
                {buildInfo.sha}
              </a>
            }
          />
          <Field term="BRANCH" value={buildInfo.branch} />
          <Field
            term="BUILD TIME"
            value={
              <time dateTime={buildInfo.buildTime}>{buildInfo.buildTime}</time>
            }
          />
          <Field term="TOTAL COMMITS" value={String(buildInfo.totalCommits)} />
          <Field
            term="FIRST COMMIT"
            value={
              <time dateTime={buildInfo.firstCommitDate}>
                {buildInfo.firstCommitDate.slice(0, 10)}
              </time>
            }
          />
          <Field
            term="REPOSITORY"
            value={
              <a
                href={buildInfo.repository}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan hover:underline"
              >
                {buildInfo.repository.replace("https://", "")}
              </a>
            }
          />
        </dl>
      </section>

      <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-cyan/10 pt-4 text-[10px] uppercase tracking-widest text-mute-500">
        <span>END OF TRANSMISSION</span>
        <a
          href={buildInfo.repository}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan/70 hover:text-cyan"
        >
          ↗ SOURCE ON GITHUB
        </a>
      </footer>
    </main>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="border border-cyan/15 bg-void-800/40 p-4">
      <p className="text-[10px] uppercase tracking-widest text-cyan/60">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-mute-100">{value}</p>
      <p className="mt-1 break-all text-[10px] uppercase tracking-wider text-mute-500">
        {hint}
      </p>
    </div>
  );
}

function PanelHeader({
  id,
  code,
  title,
}: {
  id: string;
  code: string;
  title: string;
}) {
  return (
    <h2
      id={id}
      className="flex items-center justify-between border-b border-cyan/10 px-4 py-2 text-[10px] uppercase tracking-widest text-cyan/70"
    >
      <span>
        <span className="text-amber">// {code}</span>
        <span className="ml-3">{title}</span>
      </span>
      <span aria-hidden className="text-cyan/30">
        ◆
      </span>
    </h2>
  );
}

function Field({ term, value }: { term: string; value: React.ReactNode }) {
  return (
    <div className="bg-void-800/60 p-4">
      <dt className="text-[10px] uppercase tracking-widest text-cyan/60">
        {term}
      </dt>
      <dd className="mt-1 break-all text-sm text-mute-200">{value}</dd>
    </div>
  );
}

function DeployHeatmap({
  days,
}: {
  days: { date: string; count: number }[];
}) {
  const cellClass = (count: number) => {
    if (count === 0) return "bg-mute-700/40";
    if (count === 1) return "bg-emerald-500/30";
    if (count === 2) return "bg-emerald-500/60";
    return "bg-emerald-500";
  };

  const firstDow = new Date(days[0].date + "T00:00:00Z").getUTCDay();
  const padded: ({ date: string; count: number } | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...days,
  ];

  const weeks: ({ date: string; count: number } | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {Array.from({ length: 7 }).map((_, di) => {
              const d = week[di];
              if (!d) {
                return <span key={di} aria-hidden className="block h-3 w-3" />;
              }
              return (
                <span
                  key={di}
                  title={`${d.date} · ${d.count} commit${d.count === 1 ? "" : "s"}`}
                  className={`block h-3 w-3 ${cellClass(d.count)}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
