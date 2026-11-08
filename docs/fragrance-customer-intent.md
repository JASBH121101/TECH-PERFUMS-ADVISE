# Fragrance customer intent

## Purpose

The deterministic intent parser converts explicit customer wording into structured fragrance preferences before catalog matching. It is deliberately conservative and does not call an AI provider or invent missing preferences.

## Supported signals

- Occasion: daily/day, office/work, evening/night.
- Climate: hot/humid/tropical and cold/winter.
- Intensity and projection: soft/subtle/discreet/non-hostigoso maps to soft intensity and close projection; strong/intense maps to strong intensity and projection.
- Character: fresh/clean.
- Families: citrus, floral, woody, gourmand, aromatic, aquatic and amber.
- Performance priority: explicit requests for long wear select the long_lasting recommendation profile.

Spanish accents are normalized. Explicit structured preferences supplied by the caller override inferred preferences. Unknown or ambiguous messages return `needsClarification: true` when no supported signal is found.

## Integration

Pass `customerMessage` to `AdvisorCore.advise({ domain: "fragrance", products, customerMessage })`. The response includes `customerIntent` (recognized preferences and signal trace) and, when enough preference dimensions are available, an explainable `preferenceMatch`.

A long-lasting request selects the existing conservative `long_lasting` profile. It does not create duration values. The profile can only score candidate attributes supplied to the engine; evidence-backed performance ranges remain governed by the performance evidence policy.

## Safety and limitations

- Phrase matching is deterministic and bounded; it is not a substitute for a follow-up question when wording is ambiguous.
- A parsed preference is a customer request, not a product fact.
- The parser does not infer allergy, skin chemistry, gender, age, budget or product performance.
- Avoided-note checks remain hard exclusions and require complete note coverage; missing note data cannot be interpreted as absence.
- The engine ranks only the candidates supplied to the advisor.
