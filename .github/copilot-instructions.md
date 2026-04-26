# Copilot instructions

## Dev server: portless

This repo's dev server runs behind [portless](https://portless.sh), which gives
us a stable HTTPS URL instead of a port number.

**Friendly URL:** `https://alexkafer.localhost:1355`
(Port 1355 is the unprivileged HTTPS port chosen so we don't need sudo to bind
443. If the proxy is already running on 443, use that instead.)

### Before spinning up a new dev server, check for an existing one

Always reuse a running instance rather than starting a new one — multiple
`next dev` processes will fight over the assigned port and pollute logs.

```bash
# 1. Is the portless proxy already running, and is our app registered?
portless ls 2>/dev/null
# Look for an "alexkafer" route. If present, just curl the URL to confirm it's healthy:
curl -skI https://alexkafer.localhost:1355/ | head -1   # expect: HTTP/2 200

# 2. Is a next dev process already running locally?
pgrep -fl "next dev" || echo "no next dev running"
```

If a healthy instance is already serving `https://alexkafer.localhost:1355/`,
**use it** — do not start another. If it's stale (404, connection refused,
hung), shut it down (see below) before starting fresh.

### Start the dev server

```bash
# One-time per machine: start the proxy on the unprivileged HTTPS port.
# Skip this if `portless ls` already shows the proxy as running.
portless proxy start --port 1355 --https

# Start the app (detached so it survives the shell). Logs go to /tmp/portless-dev.log.
cd /Users/alexkafer/Development/alexkafer
nohup portless alexkafer next dev > /tmp/portless-dev.log 2>&1 &
```

Portless assigns a random internal port via `PORT=…` and proxies
`https://alexkafer.localhost:1355` → that port. Next.js picks up `PORT`
automatically.

### Tail the logs

```bash
tail -f /tmp/portless-dev.log              # follow live
tail -100 /tmp/portless-dev.log            # recent slice
grep -i "error\|warn" /tmp/portless-dev.log  # quick triage
```

If you started the dev process via `bash` tool with `mode: "async"` and
`detach: true` (the agent pattern), output is also redirected to a
`/var/folders/.../copilot-detached-*.log` file printed when you started it.

### Shut down

```bash
# Stop the dev process (graceful). Find the PID:
pgrep -fl "next dev|portless alexkafer"
# Then:
kill <PID>

# Or stop everything portless-managed including the proxy:
portless proxy stop
```

A hard reset if things are wedged:

```bash
pkill -f "next dev" 2>/dev/null
portless proxy stop 2>/dev/null
rm -rf .next
```

(`pkill` is fine here despite the global "use specific PIDs" rule — these are
processes we own and explicitly want to terminate as a class. If you prefer:
`pgrep -f "next dev" | xargs -r kill`.)

### Troubleshooting

- **Port 1355 already in use by something else**: pick another with
  `portless proxy start --port 1356 --https`. Update this file if the new
  port becomes the team default.
- **Browser shows cert warning**: re-run `portless proxy start` once — it
  re-trusts the local CA.
- **Build flake** (`Cannot find module for page: /api/ab/*`, `_document`,
  `/robots.txt`): `rm -rf .next && npm run build`, retry up to 2-3 times.
