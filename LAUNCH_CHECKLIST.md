# Launch Checklist

User actions required to take alexkafer.com live on Cloudflare Workers.

## Cloudflare provisioning

- [x] Repo pushed to GitHub
- [x] `wrangler login` (Cloudflare account authorized locally)
- [x] `wrangler d1 create alexkafer-ab` → paste the printed `database_id`
      into `wrangler.toml` (replace `REPLACE_WITH_D1_ID`)
      → id `b5a02e06-091e-4388-bfab-fe6d5a401a25`
- [x] `wrangler d1 migrations apply alexkafer-ab --remote` (creates the
      `ab_events` table + indexes from `migrations/0001_init.sql`)
- [x] `npm run cf:deploy` succeeds end-to-end
      → live at https://alexkafer.lucky-bird-b768.workers.dev
- [x] Confirm the `StatsAggregator` Durable Object migration applied
      (only happens on first deploy — check `wrangler tail` or the
      Workers dashboard for the binding)
      → confirmed in deploy output and via `/api/ab/impression`
      returning `alreadyImpressed`

## Domain + DNS

- [x] Add `alexkafer.com` as a custom domain on the Worker (Workers
      dashboard → the worker → Settings → Domains & Routes → Add Custom
      Domain)
- [x] If `alexkafer.com` already uses Cloudflare DNS: the custom-domain
      flow auto-creates the CNAME. Otherwise, either move NS to
      Cloudflare or add a proxied CNAME from the registrar.
- [x] HTTPS verified (Cloudflare auto-provisions; check both apex and
      `www`)

## Content + UX

- [ ] LinkedIn URL confirmed in `src/components/chrome/footer.tsx`
      (resolve any TODO placeholder)
- [ ] OG image renders correctly in Twitter / LinkedIn / Slack link
      previewers
- [ ] Lighthouse audit ≥ 90 desktop (Performance / Accessibility /
      Best Practices / SEO)
- [ ] 404 page styled (Next default acceptable; can customize later)
- [ ] Confirm devtools overlay (`?`), Konami code, and view-source
      easter egg work in production
- [ ] Reduced-motion preference respected (test in macOS *and* Windows
      accessibility settings)
- [ ] Mobile smoke test on real iOS Safari + Android Chrome

## Lab section (D1 + DO)

- [ ] Lab section loads on production
- [ ] Impression POST returns `{ alreadyImpressed }` (DO path, not the
      libsql fallback)
- [ ] Click button records a conversion; second click in same session
      returns `alreadyConverted: true`
- [ ] Scorecard updates and the displayed `STATS_QUERY` matches the
      query in `src/lib/ab.ts`
- [ ] Spot-check D1 has rows: `wrangler d1 execute alexkafer-ab
      --remote --command "SELECT variant, event, COUNT(*) FROM
      ab_events GROUP BY 1,2"`
