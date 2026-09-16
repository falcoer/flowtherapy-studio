import { test } from "node:test";
import assert from "node:assert/strict";
import { IDBFactory } from "fake-indexeddb";
import type { Brand, Campaign } from "../src/domain/model.js";
import {
  analyzeImpact,
  createDraft,
  latestRelease,
  migrateBrandV2,
  migrateCampaignBrand,
  publishDraft,
  updateColorToken,
} from "../src/domain/brand-configuration.js";
import {
  BrandConfigurationConflict,
  BrandConfigurationStore,
  exportBrandConfiguration,
  importBrandConfiguration,
} from "../src/storage/brand-configuration.js";

function legacyBrand(): Brand {
  return {
    schemaVersion: 2,
    id: "flow-therapy",
    revision: 7,
    name: "Flow Therapy",
    colors: {
      background: "#FFFFFF",
      surface: "#F5F5F5",
      text: "#111111",
      blue: "#0055AA",
      darkBlue: "#55AAFF",
    },
    fonts: { title: { assetId: "font-title" } },
    logos: { primary: { assetId: "logo-primary" } },
  };
}
function campaign(brand: Brand): Campaign {
  return {
    schemaVersion: 3,
    id: "campaign-test",
    revision: 1,
    name: "Campagne test",
    locale: "fr-FR",
    content: {},
    supports: [],
    assets: [],
    brand: structuredClone(brand),
  };
}

test("Brand v2 migration is deterministic and creates the color.primary release", () => {
  const first = migrateBrandV2(legacyBrand()),
    second = migrateBrandV2(legacyBrand()),
    release = latestRelease(first);
  assert.deepEqual(second, first);
  assert.equal(release.version, 1);
  assert.equal(
    release.objects.find((object) => object.id === "color.primary")?.value,
    "#0055AA",
  );
  assert.ok(
    release.relations.some(
      (relation) =>
        relation.sourceId === "component.brand-accent" &&
        relation.targetId === "color.primary",
    ),
  );
});

test("draft impact is reproducible, validates contrast and publishes an immutable release", () => {
  const configuration = migrateBrandV2(legacyBrand()),
    draft = updateColorToken(createDraft(configuration), "color.primary", "#003366"),
    usages = [
      {
        id: "template:concert",
        label: "Concert illustré",
        kind: "template" as const,
        objectIds: ["color.primary"],
        migration: "manual" as const,
      },
      {
        id: "campaign:test",
        label: "Campagne test",
        kind: "campaign" as const,
        objectIds: ["color.primary"],
        migration: "automatic" as const,
      },
    ],
    report = analyzeImpact(draft, usages);
  assert.deepEqual(analyzeImpact(draft, usages), report);
  assert.deepEqual(report.changedIds, ["color.primary"]);
  assert.ok(report.dependentIds.includes("component.brand-accent"));
  assert.equal(report.templates[0]?.label, "Concert illustré");
  assert.equal(report.campaigns[0]?.label, "Campagne test");
  assert.equal(report.findings.some((finding) => finding.severity === "error"), false);

  const published = publishDraft(
    configuration,
    draft,
    report,
    "2026-09-16T08:00:00.000Z",
  );
  assert.equal(published.releases.length, 2);
  assert.equal(published.draft, undefined);
  assert.equal(latestRelease(configuration).version, 1);
  assert.equal(latestRelease(published).version, 2);
  assert.equal(
    latestRelease(configuration).objects.find((object) => object.id === "color.primary")?.value,
    "#0055AA",
  );
  assert.equal(
    latestRelease(published).objects.find((object) => object.id === "color.primary")?.value,
    "#003366",
  );
});

test("historical campaign stays unchanged until explicit migration", () => {
  const brand = legacyBrand(),
    historical = campaign(brand),
    configuration = migrateBrandV2(brand),
    draft = updateColorToken(createDraft(configuration), "color.primary", "#003366"),
    published = publishDraft(
      configuration,
      draft,
      analyzeImpact(draft),
      "2026-09-16T08:00:00.000Z",
    );
  assert.equal(historical.brand!.colors.blue, "#0055AA");
  const migrated = migrateCampaignBrand(historical, latestRelease(published));
  assert.equal(historical.brand!.colors.blue, "#0055AA");
  assert.equal(migrated.brand!.colors.blue, "#003366");
  assert.equal(migrated.brand!.revision, 2);
});

test("configuration JSON and IndexedDB keep releases, relations and optimistic revisions", async () => {
  const factory = new IDBFactory(),
    store = new BrandConfigurationStore("brand-config-test", factory),
    initial = migrateBrandV2(legacyBrand()),
    restored = importBrandConfiguration(exportBrandConfiguration(initial));
  assert.deepEqual(restored, initial);

  const saved = await store.save(initial, null);
  assert.equal(saved.revision, 1);
  const draft = updateColorToken(createDraft(saved), "color.primary", "#003366");
  const savedDraft = await store.save({ ...saved, draft }, 1);
  assert.equal(savedDraft.revision, 2);
  assert.equal((await store.load(saved.brandId))!.draft!.changeSet.operations.length, 1);
  await assert.rejects(store.save(saved, 1), BrandConfigurationConflict);
  assert.equal((await store.load(saved.brandId))!.revision, 2);
  await store.close();
});
