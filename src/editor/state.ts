import {
  createSupport,
  resolvePlacements,
  validateCampaign,
} from "../domain/core.js";
import type {
  Campaign,
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
      schemaVersion: 1,
      id: crypto.randomUUID(),
      revision: 1,
      name: "Nouvelle campagne",
      locale: "fr-FR",
      content: { title: "Nos prochains concerts", events: [] },
      assets: [],
      supports: [],
    },
    assets: new Map(),
  };
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
    bindings: { title: "title", events: "events" },
  });
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
