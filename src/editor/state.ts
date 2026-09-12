import {
  createSupport,
  campaignContent,
  editorialKey,
  resolvePlacements,
  validateCampaign,
} from "../domain/core.js";
import {
  recipeToDirection,
  resolveSupportDirection,
  supportedOverrides,
  validateCreativeDirection,
} from "../domain/creative.js";
import type { CreativeRecipe } from "../domain/creative.js";
import type {
  Campaign,
  CreativeDirection,
  CreativeOverrides,
  Format,
  PlacementOverride,
  Template,
} from "../domain/model.js";
import type { CampaignBundle } from "../storage/indexeddb.js";

export interface History<T> {
  past: T[];
  present: T;
  future: T[];
}
export function edit<T>(history: History<T>, present: T): History<T> {
  return {
    past: [...history.past.slice(-49), history.present],
    present,
    future: [],
  };
}
export function undo<T>(h: History<T>): History<T> {
  return h.past.length
    ? {
        past: h.past.slice(0, -1),
        present: h.past.at(-1)!,
        future: [h.present, ...h.future],
      }
    : h;
}
export function redo<T>(h: History<T>): History<T> {
  return h.future.length
    ? {
        past: [...h.past, h.present],
        present: h.future[0],
        future: h.future.slice(1),
      }
    : h;
}
export function newCampaign(): CampaignBundle {
  return {
    campaign: {
      schemaVersion: 3,
      id: crypto.randomUUID(),
      revision: 1,
      name: "Nouvelle campagne",
      locale: "fr-FR",
      content: { title: "Nos prochains concerts", events: [] },
      creativeDirection: recipeToDirection({
        recipeVersion: 2,
        name: "Funk électrique",
        energy: 65,
        colorExpression: 60,
        density: 45,
        scale: 65,
        dominant: "balanced",
        harmony: "petrol",
      }),
      assets: [],
      supports: [],
    },
    assets: new Map(),
  };
}
export function setCreativeDirection(
  campaign: Campaign,
  direction: CreativeDirection,
): Campaign {
  const next = structuredClone(campaign);
  validateCreativeDirection(direction, next);
  next.creativeDirection = structuredClone(direction);
  validateCampaign(next);
  return next;
}
export function applyCreativeRecipe(
  campaign: Campaign,
  recipe: CreativeRecipe,
): Campaign {
  const current = campaign.creativeDirection;
  const fallback = campaign.assets.find((asset) =>
    asset.mimeType.startsWith("image/"),
  );
  const imageAssetId = current?.imageAssetId ?? fallback?.id;
  return setCreativeDirection(
    campaign,
    recipeToDirection(recipe, imageAssetId),
  );
}
export function adjustCreativeDirection(
  campaign: Campaign,
  supportId: string,
  overrides: CreativeOverrides,
): Campaign {
  const next = structuredClone(campaign);
  const support = next.supports.find((item) => item.id === supportId);
  if (!support) throw new Error("Support introuvable.");
  support.creativeOverrides = supportedOverrides(support, overrides);
  validateCreativeDirection(resolveSupportDirection(next, support), next);
  validateCampaign(next);
  return next;
}
export function resetCreativeDirection(
  campaign: Campaign,
  supportId: string,
): Campaign {
  const next = structuredClone(campaign);
  const support = next.supports.find((item) => item.id === supportId);
  if (!support) throw new Error("Support introuvable.");
  delete support.creativeOverrides;
  validateCampaign(next);
  return next;
}
export function activate(
  c: Campaign,
  template: Template,
  formats: Format[],
  layoutId: string,
): Campaign {
  const next = structuredClone(c);
  const support = createSupport({
    id: crypto.randomUUID(),
    name: template.name,
    template,
    formats,
    layoutIds: [layoutId],
    bindings: Object.fromEntries(
      template.fields
        .filter((f) => Object.hasOwn(campaignContent(next), f.id))
        .map((f) => [f.id, f.id]),
    ),
  });
  const first =
    next.editorial?.find((d) => d.kind !== "event") ?? next.editorial?.[0];
  if (template.id === "ft:editorial-note" && first) {
    support.bindings.title = editorialKey(first.id, "title");
    support.bindings.body = editorialKey(first.id, "body");
  }
  if (
    template.id === "ft:agenda" &&
    Array.isArray(next.content.events) &&
    !next.content.events.length &&
    campaignContent(next)["editorial:events"]
  )
    support.bindings.events = "editorial:events";
  next.supports.push(support);
  validateCampaign(next);
  return next;
}
export function adjust(
  c: Campaign,
  supportId: string,
  variantId: string,
  layerId: string,
  patch: PlacementOverride,
): Campaign {
  const next = structuredClone(c),
    support = next.supports.find((s) => s.id === supportId);
  const variant = support?.variants.find((v) => v.id === variantId),
    layer = support?.template.layers.find((l) => l.id === layerId);
  if (!support || !variant || !layer) throw new Error("Sélection introuvable.");
  const old = resolvePlacements(support, variant).find(
    (p) => p.layerId === layerId,
  )!;
  if (patch.frame) {
    if (
      !layer.editing.move &&
      (patch.frame.x !== old.frame.x || patch.frame.y !== old.frame.y)
    )
      throw new Error("Déplacement verrouillé.");
    if (
      !layer.editing.resize &&
      (patch.frame.width !== old.frame.width ||
        patch.frame.height !== old.frame.height)
    )
      throw new Error("Dimensions verrouillées.");
  }
  if (patch.rotation !== undefined && !layer.editing.move)
    throw new Error("Rotation verrouillée.");
  if (patch.visible !== undefined && !layer.editing.hide)
    throw new Error("Visibilité verrouillée.");
  if (patch.style && !layer.editing.restyle)
    throw new Error("Style verrouillé.");
  if (patch.imageFit && (layer.type !== "image" || !layer.editing.resize))
    throw new Error("Recadrage verrouillé.");
  variant.placementOverrides[layerId] = {
    ...variant.placementOverrides[layerId],
    ...patch,
  };
  validateCampaign(next);
  return next;
}
