import { Section, SectionInner } from "@/components/section";
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

const DEMOS: Demo[] = (demosData as Demo[])
  .filter((d) => !d.hidden)
  .sort((a, b) => (b.pushedAt > a.pushedAt ? 1 : -1));

function DemoCard({ demo }: { demo: Demo }) {
  const ghUrl = `https://github.com/${demo.repo}`;
  return (
    <article className="group flex h-full flex-col gap-3 rounded-md border border-mute-700/50 bg-void-800/40 p-5 transition-colors hover:border-cyan/40">
      <header className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 truncate text-sm font-semibold text-mute-100">
          {demo.name}
        </h3>
        {demo.stars > 0 && (
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-mute-500">
            ★ {demo.stars}
          </span>
        )}
      </header>
      <p className="flex-1 text-pretty text-xs leading-relaxed text-mute-300">
        {demo.description || (
          <span className="text-mute-500">{"// no description"}</span>
        )}
      </p>
      <footer className="flex items-center justify-between gap-3 pt-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-cyan/70">
          {demo.language || "—"}
        </span>
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest">
          {demo.homepage && (
            <a
              href={demo.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber transition-colors hover:text-amber/70"
            >
              live →
            </a>
          )}
          <a
            href={ghUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-mute-300 transition-colors hover:text-cyan"
          >
            github →
          </a>
        </div>
      </footer>
    </article>
  );
}

export function DemosSection() {
  return (
    <Section id="demos" aria-label="Demos and projects" className="!min-h-0">
      <SectionInner className="flex flex-col gap-12">
        <div className="space-y-6">
          <p
            id="demos-marker"
            className="ml-9 font-mono text-sm uppercase tracking-widest text-amber"
          >
            {"// 02 · DEMOS"}
          </p>
          <h2 className="text-balance font-sans text-4xl font-semibold leading-tight text-mute-100 md:text-6xl">
            <span className="block">Things I&apos;ve built.</span>
            <span className="mt-2 block text-cyan">
              Side projects, prototypes, &amp; experiments.
            </span>
          </h2>
          <p className="max-w-2xl text-pretty text-base leading-relaxed text-mute-300">
            A curated slice of public repositories.
          </p>
        </div>

        {DEMOS.length === 0 ? (
          <p className="font-mono text-xs text-mute-500">
            {"// no demos yet — run `npm run demos:refresh`"}
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DEMOS.map((demo) => (
              <li key={demo.repo} className="h-full">
                <DemoCard demo={demo} />
              </li>
            ))}
          </ul>
        )}
      </SectionInner>
    </Section>
  );
}

export default DemosSection;
