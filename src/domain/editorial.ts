import type { Campaign, EditorialDocument, Field, Value } from "./model.js";
import {
  campaignContent,
  validateCampaign,
  validateEditorial,
} from "./core.js";
import { attachResource } from "./branding.js";

export const editorialKinds = {
  article: "Article",
  announcement: "Annonce",
  event: "Événement",
  presentation: "Présentation",
};
export const editorialStatuses = {
  draft: "Brouillon",
  ready: "Prêt",
  archived: "Archivé",
};
export function newEditorial(
  id: string,
  kind: EditorialDocument["kind"] = "article",
): EditorialDocument {
  return {
    schemaVersion: 1,
    id,
    revision: 1,
    kind,
    status: "draft",
    title: "",
    summary: "",
    body: "",
    locale: "fr-FR",
    tags: [],
    assets: [],
    ...(kind === "event" ? { event: { date: "", location: "" } } : {}),
  };
}
/** Explicit import of a saved revision. Repeating the operation never replaces it. */
export function includeEditorial(
  input: Campaign,
  source: EditorialDocument,
): Campaign {
  validateEditorial(source);
  if (source.status === "archived")
    throw new Error(
      "Un contenu archivé ne peut pas être ajouté à une campagne.",
    );
  const next = structuredClone(input),
    document = structuredClone(source);
  if (next.editorial?.some((d) => d.id === document.id))
    throw new Error(
      "Ce contenu est déjà sélectionné. Retirez ses liaisons puis sa copie avant de choisir une nouvelle révision.",
    );
  document.assets = document.assets.map((asset) => {
    const id = attachResource(next, asset);
    return structuredClone(next.assets.find((a) => a.id === id)!);
  });
  (next.editorial ??= []).push(document);
  validateCampaign(next);
  return next;
}
export function removeEditorial(input: Campaign, id: string): Campaign {
  const next = structuredClone(input);
  next.editorial = (next.editorial ?? []).filter((d) => d.id !== id);
  // Existing bindings/selections must be changed first, including masked overrides.
  validateCampaign(next);
  return next;
}
export function compatibleContent(field: Field, value: Value): boolean {
  if (field.type === "collection")
    return Array.isArray(value) && value.length >= field.minItems;
  if (field.type === "image")
    return typeof value === "object" && !Array.isArray(value);
  return typeof value === "string";
}
export function bindEditorialField(
  input: Campaign,
  supportId: string,
  fieldId: string,
  key: string,
): Campaign {
  const next = structuredClone(input),
    support = next.supports.find((s) => s.id === supportId);
  if (!support) throw new Error("Support introuvable.");
  const field = support.template.fields.find((f) => f.id === fieldId),
    value = campaignContent(next)[key];
  if (!field || value === undefined || !compatibleContent(field, value))
    throw new Error("Contenu incompatible avec ce champ.");
  support.bindings[fieldId] = key;
  delete support.overrides[fieldId];
  delete support.eventSelections[fieldId];
  validateCampaign(next);
  return next;
}
