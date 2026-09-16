import { test } from "node:test";
import assert from "node:assert/strict";
import type { Asset, Brand, Campaign, EditorialDocument } from "../src/domain/model.js";
import { buildLibraryIndex } from "../src/domain/library.js";
import { migrateBrandV2 } from "../src/domain/brand-configuration.js";

const image: Asset = {
  id: "image-master",
  path: "assets/image.png",
  mimeType: "image/png",
  sha256: "a".repeat(64),
  source: "photo.png",
  rights: "Test",
};
const font: Asset = {
  id: "font-master",
  path: "assets/font.ttf",
  mimeType: "font/ttf",
  sha256: "b".repeat(64),
  source: "font.ttf",
  rights: "Test",
};
const logo: Asset = {
  id: "logo-master",
  path: "assets/logo.png",
  mimeType: "image/png",
  sha256: "c".repeat(64),
  source: "logo.png",
  rights: "Test",
};

function brand(): Brand {
  return {
    schemaVersion: 2,
    id: "brand",
    revision: 1,
    name: "Brand",
    colors: { blue: "#168AD5" },
    fonts: { title: { assetId: font.id } },
    logos: { primary: { assetId: logo.id } },
  };
}
function campaign(): Campaign {
  return {
    schemaVersion: 3,
    id: "campaign",
    revision: 1,
    name: "Campagne",
    locale: "fr-FR",
    content: {},
    supports: [],
    assets: [
      { ...image, id: "image-snapshot", path: "assets/snapshot.png" },
      font,
      logo,
    ],
    brand: brand(),
  };
}
function editorial(): EditorialDocument {
  return {
    schemaVersion: 1,
    id: "article",
    revision: 1,
    kind: "article",
    status: "ready",
    title: "Article",
    summary: "Résumé",
    body: "Corps",
    locale: "fr-FR",
    tags: [],
    assets: [{ ...image, id: "editorial-image", path: "assets/editorial.png" }],
  };
}

test("library index resolves snapshots by hash and release roles by stable asset id", () => {
  const index = buildLibraryIndex(
      [image, font, logo],
      [campaign()],
      [editorial()],
      migrateBrandV2(brand()),
    ),
    imageEntry = index.find((entry) => entry.asset.sha256 === image.sha256)!,
    fontEntry = index.find((entry) => entry.asset.sha256 === font.sha256)!,
    logoEntry = index.find((entry) => entry.asset.sha256 === logo.sha256)!;

  assert.equal(index.length, 3);
  assert.equal(imageEntry.kind, "image");
  assert.deepEqual(
    new Set(imageEntry.usages.map((usage) => usage.kind)),
    new Set(["campaign", "editorial"]),
  );
  assert.ok(fontEntry.usages.some((usage) => usage.role === "Police de marque · title"));
  assert.ok(fontEntry.usages.some((usage) => usage.role === "Police · title"));
  assert.ok(logoEntry.usages.some((usage) => usage.role === "Logo de marque · primary"));
  assert.ok(logoEntry.usages.some((usage) => usage.role === "Logo · primary"));
});

test("library index does not invent entries for snapshots absent from the canonical catalogue", () => {
  const unknown = { ...image, sha256: "d".repeat(64), id: "missing" },
    document = { ...editorial(), assets: [unknown] };
  const index = buildLibraryIndex([image], [], [document]);
  assert.equal(index.length, 1);
  assert.equal(index[0].usages.length, 0);
});
