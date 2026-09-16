import { test } from "node:test";
import assert from "node:assert/strict";
import { IDBFactory } from "fake-indexeddb";
import type { Brand, Campaign } from "../src/domain/model.js";
import {
  analyzeImpact,
  brandFromRelease,
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

test("Brand v2 aliases resolve to one deterministic semantic color", () => {
  const brand: Brand = {
      ...legacyBrand(),
      id: "legacy-aliases",
      colors: {
        background: "#FFFFFF",
        blue: "#111111",
        primary: "#222222",
      },
    },
    release = latestRelease(migrateBrandV2(brand)),
    primaries = release.objects.filter((object) => object.id === "color.primary");
  assert.equal(primaries.length, 1);
  assert.equal(primaries[0].value, "#222222");
  assert.equal(primaries[0].metadata?.legacyRole, "primary");
  const projected = brandFromRelease(brand, release);
  assert.equal(projected.colors.primary, "#222222");
  assert.equal(projected.colors.blue, "#222222");
});

test("Brand v2 without blue gets a deterministic primary fallback without orphan relations", () => {
  const brand: Brand = {
    ...legacyBrand(),
    id: "legacy-accent-only",
    colors: { accent: "#7130C8" },
  };
  const configuration = migrateBrandV2(brand),
    release = latestRelease(configuration),
    primary = release.objects.find((object) => object.id === "color.primary");
  assert.equal(primary?.value, "#7130C8");
  assert.equal(primary?.metadata?.legacyRole, "blue");
  assert.equal(primary?.metadata?.sourceLegacyRole, "accent");
  assert.equal(primary?.metadata?.migratedFallback, "true");
  assert.equal(
    release.relations.some((relation) => relation.targetId === "color.background"),
    false,
  );
  assert.deepEqual(
    importBrandConfiguration(exportBrandConfiguration(configuration)),
    configuration,
  );
});

test("release projection restores its own colors, font roles and logos", () => {
  const original = legacyBrand(),
    release = latestRelease(migrateBrandV2(original)),
    changed = structuredClone(original);
  changed.colors.blue = "#ABCDEF";
  changed.fonts.title = { assetId: "font-new" };
  changed.fonts.body = { assetId: "font-body-new" };
  changed.logos = { primary: { assetId: "logo-new" } };
  const projected = brandFromRelease(changed, release);
  assert.equal(projected.id, release.brandId);
  assert.equal(projected.revision, release.version);
  assert.equal(projected.colors.blue, "#0055AA");
  assert.deepEqual(projected.fonts, { title: { assetId: "font-title" } });
  assert.deepEqual(projected.logos, {
    primary: { assetId: "logo-primary" },
  });
});

test("draft impact is reproducible, validates contrast and publishes an immutable release", () => {
  const configuration = migrateBrandV2(legacyBrand()),
    draft = updateColorToken(
      createDraft(configuration),
      "color.primary",
      "#003366",
    ),
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
  assert.equal(
    report.findings.some((finding) => finding.severity === "error"),
    false,
  );

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
    latestRelease(configuration).objects.find(
      (object) => object.id === "color.primary",
    )?.value,
    "#0055AA",
  );
  assert.equal(
    latestRelease(published).objects.find(
      (object) => object.id === "color.primary",
    )?.value,
    "#003366",
  );
});

test("publication rejects a stale draft and a stale impact report", () => {
  const configuration = migrateBrandV2(legacyBrand()),
    firstDraft = updateColorToken(
      createDraft(configuration),
      "color.primary",
      "#003366",
    ),
    release2 = publishDraft(
      configuration,
      firstDraft,
      analyzeImpact(firstDraft),
      "2026-09-16T08:00:00.000Z",
    );
  assert.throws(
    () =>
      publishDraft(
        release2,
        firstDraft,
        analyzeImpact(firstDraft),
        "2026-09-16T09:00:00.000Z",
      ),
    /release obsolète/,
  );

  const currentDraft = updateColorToken(
      createDraft(release2),
      "color.primary",
      "#002244",
    ),
    staleReport = { ...analyzeImpact(currentDraft), changedIds: [] };
  assert.throws(
    () =>
      publishDraft(
        release2,
        currentDraft,
        staleReport,
        "2026-09-16T09:00:00.000Z",
      ),
    /ne correspond plus/,
  );
});

test("historical campaign stays unchanged and support refs migrate explicitly", () => {
  const brand = legacyBrand(),
    historical = campaign(brand);
  historical.supports.push({
    id: "support-test",
    name: "Support test",
    template: {
      schemaVersion: 1,
      id: "template-test",
      revision: 1,
      name: "Template test",
      brandRef: { id: brand.id, revision: brand.revision },
      fields: [],
      layers: [],
      layouts: [],
    },
    bindings: {},
    overrides: {},
    eventSelections: {},
    variants: [],
  });
  const configuration = migrateBrandV2(brand),
    draft = updateColorToken(
      createDraft(configuration),
      "color.primary",
      "#003366",
    ),
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
  assert.deepEqual(migrated.supports[0].template.brandRef, {
    id: brand.id,
    revision: 2,
  });
});

test("configuration JSON and IndexedDB keep releases, relations and optimistic revisions", async () => {
  const factory = new IDBFactory(),
    store = new BrandConfigurationStore("brand-config-test", factory),
    initial = migrateBrandV2(legacyBrand()),
    restored = importBrandConfiguration(exportBrandConfiguration(initial));
  assert.deepEqual(restored, initial);

  const saved = await store.save(initial, null);
  assert.equal(saved.revision, 1);
  const draft = updateColorToken(
    createDraft(saved),
    "color.primary",
    "#003366",
  );
  const savedDraft = await store.save({ ...saved, draft }, 1);
  assert.equal(savedDraft.revision, 2);
  assert.equal(
    (await store.load(saved.brandId))!.draft!.changeSet.operations.length,
    1,
  );
  await assert.rejects(store.save(saved, 1), BrandConfigurationConflict);
  assert.equal((await store.load(saved.brandId))!.revision, 2);

  const oldBackup = { ...initial, revision: 1 };
  const imported = await store.replaceImported(oldBackup);
  assert.equal(imported.revision, 3);
  await assert.rejects(store.save(savedDraft, 2), BrandConfigurationConflict);
  assert.equal((await store.load(saved.brandId))!.revision, 3);
  await store.close();
});
