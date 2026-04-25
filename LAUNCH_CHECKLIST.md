# Launch Checklist

User actions required to take alexkafer.com live.

- [ ] Repo pushed to GitHub
- [ ] Project imported to Vercel (or `vercel link` from CLI)
- [ ] alexkafer.com DNS pointed (apex `A 76.76.21.21` + `CNAME www → cname.vercel-dns.com`, **or** Vercel nameservers at the registrar)
- [ ] HTTPS verified (Vercel auto-provisions; check both apex and www)
- [ ] LinkedIn URL confirmed in `src/components/chrome/footer.tsx` (resolve any TODO placeholder)
- [ ] OG image renders correctly in Twitter / LinkedIn / Slack link previewers
- [ ] Lighthouse audit ≥ 90 desktop (Performance / Accessibility / Best Practices / SEO)
- [ ] Vercel Analytics enabled (Project Settings → Analytics)
- [ ] 404 page styled (Next default acceptable; can customize later)
- [ ] Confirm devtools overlay (`?`), Konami code, and view-source easter egg work in production
- [ ] Reduced-motion preference respected (test in macOS *and* Windows accessibility settings)
- [ ] Mobile smoke test on real iOS Safari + Android Chrome
