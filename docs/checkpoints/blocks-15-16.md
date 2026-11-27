# JBAE Checkpoint — Blocks 15, 15.1 and 16

Project: JB Advisor Engine (JBAE)
Repository: JASBH121101/TECH-PERFUMS-ADVISE

## Current release

- Version: v0.4.130
- versionCode: 130
- Status: PUBLISHED / CERTIFIED BY CI
- APK: https://github.com/JASBH121101/TECH-PERFUMS-ADVISE/releases/download/jbae-v0.4.130/JBAE.apk
- APK SHA-256: 1c0d38762f4ac53a000e8a62ca5e3c82faeb43a377ed0ca2a6267eacf2839f4a
- Source commit: a6f273020f98b6361070459c2ea19b5aceb7c2b9
- Android Release workflow #130: SUCCESS
- Engine CI #510: SUCCESS

## Branch and protection

- Branch: feature/jbae-android-certification
- PR #7: OPEN / DRAFT / NOT MERGED
- PR base: feature/jbae-standalone-android-app
- main: unchanged at b6b75050f63825c217e81a15957b9dd83a8745ca
- Do not merge to main without explicit authorization.

## Block 15 — Intelligent customer intent

- Recognizes supported commercial perfume references and explicit direction modifiers.
- Does not invent a reference perfume's notes, families, concentration or performance.
- Unsupported/reference-only requests remain clarification-needed.

## Block 15.1 — Short use-case interpretation

The mobile Advisor now understands concise customer requests and converts them into ranking preferences using existing Scento catalogue character and time-of-day fields.

- “Para gimnasio” -> fresh, clean and citrusy character; day use.
- “Para trabajo pesado” -> fresh, clean, citrusy and herbal character; day use.
- “Para trabajo leve” / office / desk work -> clean and fresh character; office/day use.
- “Para diario” -> day-use catalogue tags without forcing a fragrance family.
- “Para salir de noche” -> evening use.
- “Para salir” without a time -> asks whether the outing is daytime or nighttime rather than assuming.
- Explicit climate, family, note or intensity requests continue to be combined with the context.
- Context summaries are shown with results so the operator can see how the request was interpreted.
- Five concise quick examples were added: Gym, Outing, Daily, Physical Work and Light Work.
- No longevity, projection, intensity or performance claim is inferred from the activity context.

## Block 16 — Recommendation quality

- Strong / partial / weak match tiers remain exposed in the matching result.
- Match reasoning continues to use documented catalogue fields, coverage and evidence limitations.
- Missing catalogue attributes are not treated as matches.
- Performance claims remain evidence-gated.

## Validation

- Engine CI #510: SUCCESS.
- Android Release #130: SUCCESS.
- Mobile application tests: SUCCESS.
- Advisor engine tests: SUCCESS.
- Web bundle and offline seed build: SUCCESS.
- Android signing identity restore: SUCCESS.
- APK signature, certificate fingerprint, package and version checks: SUCCESS.
- Published APK asset verification / byte comparison: SUCCESS.
- Release tag: jbae-v0.4.130.
- Package: com.jb.advisor.mobile.
- No merge performed; main remains untouched.

## Next work

- Block 17 — Commercial perfumery workflow: prepare the business's own catalogue integration, with real prices, stock and availability only when supplied.
- Keep the workflow offline-first and preserve source catalogue data.
- Continue in two-block batches and certify Android only after the matching CI/release checks pass.
