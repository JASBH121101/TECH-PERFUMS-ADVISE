# JB Advisor Engine

**Independent product-advisory intelligence for fragrance and technology.**

JB Advisor Engine is the intelligence layer behind the TECH-PERFUMS-ADVISE Android application. It combines deterministic domain rules, evidence-backed research, product comparison, and preference-aware recommendations.

## Product identity

- **Engine:** JB Advisor Engine (JBAE)
- **Tagline:** Understand. Compare. Recommend.
- **Domains:** Fragrance and personal technology
- **Application modules:** Fragrance Advisor and Tech Advisor

## Architecture principles

1. Evidence before assertion: every sourced fact keeps provenance and retrieval date.
2. Deterministic decisions: scoring and validation rules are explicit, testable, and explainable.
3. Hybrid autonomy: routine unverified knowledge can be refreshed automatically; verified facts, policy changes, destructive actions, and cost-bearing integrations require approval.
4. Offline-first: local knowledge and core rules remain usable without a network connection.
5. Domain separation: fragrance and technology use separate domain models and scoring criteria.
6. Privacy and cost control: no secrets in source code; external paid services are opt-in.

## Repository layout

The `main` branch contains the public application foundation. Active engine development takes place in `feature/jb-advisor-engine`.

## Development

- Node.js 22+
- npm
- ES modules
- Node's built-in test runner

```bash
npm ci
npm run check
npm test
```

## Security

Never commit API keys, access tokens, private customer data, or local environment files. Use GitHub Actions secrets for CI credentials.

## Status

Foundation initialized. Engine implementation and domain modules are developed incrementally and validated before integration into the Android application.
