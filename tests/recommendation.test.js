import test from "node:test";
import assert from "node:assert/strict";
import { recommendProducts, buildRecommendationCriteria, getRecommendationProfiles } from "../src/recommendation/recommend.js";
import { EvidenceStore } from "../src/core/evidence-store.js";

const phones = [
  { id: "a", name: "Phone A", domain: "technology", attributes: { cameraScore: 95, batteryLifeHours: 8, priceUSD: 900 } },
  { id: "b", name: "Phone B", domain: "technology", attributes: { cameraScore: 80, batteryLifeHours: 12, priceUSD: 650 } },
];

const perfumes = [
  { id: "p1", name: "Fresh One", domain: "fragrance", attributes: { climateSuitabilityScore: 95, versatilityScore: 90, priceUSD: 70 } },
  { id: "p2", name: "Heavy One", domain: "fragrance", attributes: { climateSuitabilityScore: 50, versatilityScore: 60, priceUSD: 90 } },
];

test("builds domain-aware criteria and respects the supplied priority order", () => {
  const criteria = buildRecommendationCriteria({
    domain: "technology",
    priorities: [
      { field: "cameraScore", weight: 5 },
      { field: "batteryLifeHours", weight: 2 },
      { field: "priceUSD", weight: 1 },
    ],
  });
  assert.deepEqual(criteria.map(item => item.field), ["cameraScore", "batteryLifeHours", "priceUSD"]);
  assert.equal(criteria[2].direction, "lower");
  assert.deepEqual(getRecommendationProfiles("fragrance").includes("hot_humid_daily"), true);
});

test("recommends based on the configured photography priorities and explains strengths", () => {
  const result = recommendProducts({
    products: phones,
    priorities: [{ field: "cameraScore", weight: 5 }, { field: "batteryLifeHours", weight: 1 }],
  });
  assert.equal(result.decision, "recommended");
  assert.equal(result.winnerId, "a");
  assert.equal(result.ranking[0].strengths[0].field, "cameraScore");
  assert.ok(result.summary.includes("Phone A"));
  assert.equal(result.evidenceMode, "not_assessed");
});

test("supports hot humid fragrance profile without assuming concentration from product type", () => {
  const result = recommendProducts({ products: perfumes, profile: "hot_humid_daily" });
  assert.equal(result.decision, "recommended");
  assert.equal(result.winnerId, "p1");
  assert.equal(result.profile, "hot_humid_daily");
});

test("does not recommend a result below the minimum evidence-scored coverage", () => {
  const result = recommendProducts({
    products: [
      { id: "a", name: "A", domain: "technology", attributes: { cameraScore: 99 } },
      { id: "b", name: "B", domain: "technology", attributes: { cameraScore: 80 } },
    ],
    priorities: [{ field: "cameraScore", weight: 1 }, { field: "batteryLifeHours", weight: 1 }],
    minimumScoredCoverage: 75,
  });
  assert.equal(result.decision, "insufficient_coverage");
  assert.equal(result.winnerId, null);
});

test("can return a tie instead of arbitrarily picking a product", () => {
  const result = recommendProducts({
    products: [
      { id: "a", name: "A", domain: "technology", attributes: { performanceScore: 90 } },
      { id: "b", name: "B", domain: "technology", attributes: { performanceScore: 90 } },
    ],
    priorities: [{ field: "performanceScore", weight: 1 }],
  });
  assert.equal(result.decision, "tie");
  assert.equal(result.winnerId, null);
});

test("requires domain-valid priorities and rejects cross-domain recommendation", () => {
  assert.throws(() => recommendProducts({
    products: phones,
    priorities: [{ field: "longevityHours", weight: 1 }],
  }), /Unsupported technology priority field/);
  assert.throws(() => recommendProducts({
    products: [phones[0], perfumes[0]],
    priorities: [{ field: "cameraScore", weight: 1 }],
  }), /different domains/);
});

test("evidence-aware recommendations do not count unverified data", () => {
  const store = new EvidenceStore();
  for (const [id, value] of [["a-camera", 95], ["b-camera", 80]]) {
    store.add({
      id, domain: "technology", subjectId: id[0], field: "cameraScore", value,
      status: "verified", confidence: 0.9,
      source: { name: "Independent review", url: `https://example.com/${id}`, type: "independent_test" },
      observedAt: "2026-10-01T00:00:00.000Z",
    });
  }
  const result = recommendProducts({
    products: [
      { ...phones[0], evidenceIds: { cameraScore: ["a-camera"] } },
      { ...phones[1], evidenceIds: { cameraScore: ["b-camera"] } },
    ],
    priorities: [{ field: "cameraScore", weight: 1 }],
    evidenceStore: store,
  });
  assert.equal(result.winnerId, "a");
  assert.equal(result.ranking[0].verifiedCoverage, 100);
  assert.equal(result.evidenceMode, "strict");
});
