# JBAE TECH Sources Worker

Server-side adapter for the TECH module. It uses public web pages and the existing Cloudflare Worker runtime only. It does not call paid device-data APIs and does not require API keys, subscriptions, or billing credentials.

- GSMArena is the first-priority reference. The Worker attempts its public HTML search/detail pages only when its robots.txt can be fetched without cross-domain redirection and the requested path is permitted.
- Xataka La Cacharrería is the second-priority technical source. Public device detail pages are queried only when robots.txt permits the path; its restricted search/API routes are not used.
- CoreInfo and TechAPI are auxiliary identity providers only (model and brand); they do not provide complete specifications.
- Source attribution, URLs, retrieval time, and RAM/storage configurations are preserved.
- Successful Xataka results are cached at the edge for six hours.

## No-cost policy

There is no API.SH, paid data API, paid proxy, subscription key, billing binding, or automatic purchase in this integration.

If a site blocks automated access, redirects robots.txt to another domain, or disallows a route, JBAE reports that source as blocked and preserves its public link for manual verification. It does not bypass access controls.

## Deploy

Worker: `jbae-specs-api`
URL: https://jbae-specs-api.jaredblancoh19.workers.dev

No secret or paid provider key is required.

## Routes

- `GET /health`
- `GET /xataka?slug=samsung-galaxy-a32-5g`
- `GET /gsmarena/phone?q=Samsung%20Galaxy%20A17`
