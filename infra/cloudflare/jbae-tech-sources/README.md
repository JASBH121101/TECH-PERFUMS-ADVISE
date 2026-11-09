# JBAE TECH Sources Worker

A server-side source adapter for the TECH module.

- Xataka La Cacharrería is queried first through its public device detail page.
- GSMArena is queried through API.SH's structured GSMArena endpoint when the Cloudflare Worker secret `APISH_KEY` is configured.
- Neither API key is shipped in GitHub Pages, the browser bundle, or the Android APK.
- The app calls this Worker; CoreInfo and TechAPI are retained as field-level fallbacks only.
- Xataka results are cached at the edge for six hours. GSMArena lookups are server-side.

## Deploy

The Worker script name is `jbae-tech-sources`; enable its `workers.dev` subdomain.

Set the secret `APISH_KEY` on the Worker after creating an API.SH account and key. Without it, the Worker reports GSMArena as `not_configured` and does not pretend to have retrieved GSMArena data.

## Routes

- `GET /health`
- `GET /xataka?slug=samsung-galaxy-s24-ultra`
- `GET /gsmarena/phone?q=Samsung%20Galaxy%20S24%20Ultra`
