# JBAE TECH Sources Worker

Server-side adapter for the TECH module. It uses public web pages and the existing Cloudflare Worker runtime only. It does not call paid device-data APIs and does not require API keys, subscriptions, or billing credentials.

- GSMArena is queried first by model using its public search page, then its device specification page when freely accessible.
- Xataka La Cacharrería is queried second using the model slug from the selected catalogue record.
- CoreInfo and TechAPI remain auxiliary identity-only providers (model and brand), never full specification providers.
- Source attribution, URLs, retrieval time, and RAM/storage combinations are retained in the result.
- Successful Xataka responses are cached at the edge for six hours.

## Important access behavior

Some automated requests to GSMArena may be rejected with HTTP 402, 403, or 429. When that happens, JBAE reports the limitation and keeps the GSMArena link available for manual opening. It does not use API.SH, another paid API, a proxy subscription, or a paywall bypass.

Xataka public device pages are queried directly. Example: https://www.xataka.com/la-cacharreria/samsung/galaxy-a32-5g

## Deploy

Worker script name: jbae-specs-api
Public URL: https://jbae-specs-api.jaredblancoh19.workers.dev
No Worker secret or paid provider key is required.

## Routes

- GET /health
- GET /xataka?slug=samsung-galaxy-a32-5g
- GET /gsmarena/phone?q=Samsung%20Galaxy%20A17
