# Watchtower — PWA (Phase 02b)

The phone app: your Zen home, status tiles, alert feed, per-alert detail, acknowledge,
and Web Push. Static site — deploy to **Azure Static Web Apps** (free tier).

## Files
```
index.html               The whole app (UI + logic)
sw.js                    Service worker — push + install + offline shell
manifest.webmanifest     PWA manifest (install to home screen)
icon-192.png / 512       App icons
staticwebapp.config.json SPA routing + service-worker header
```

## Deploy (GitHub → Azure Static Web Apps)

1. Push this to a **new** GitHub repo (e.g. `watchtower-app`).
2. Azure portal → create **Static Web App** → plan **Free** → source **GitHub** →
   pick the repo / `main`. Build presets: **Custom**. App location `/`, Api location
   *(blank)*, Output location `/`. Create — it wires a GitHub Action and gives you a URL.

## Connect it (one-time, on device)

Open the SWA URL. The app asks for three things (stored on the device only, never in the repo):

- **API base URL** — your Function App URL, e.g. `https://func-watchtower-….azurewebsites.net`
- **Function host key** — Function App → App keys → Host keys → `default` → Show value
- **VAPID public key** — the public key you generated in Phase 02a

## Two things to set on the Function App

- **CORS:** Function App → CORS → add your SWA origin (`https://<name>.azurestaticapps.net`).
- (HTTPS is automatic on both — required for service workers + push.)

## Push notes

- **iOS:** you must **install to the home screen** (Share → Add to Home Screen) and open it
  from there *before* push will work — iOS only allows Web Push for installed PWAs.
- Tap **Enable** on the home screen to grant permission + subscribe this device.

Phase 02c: lock the app behind Entra login and do the full end-to-end push test.
