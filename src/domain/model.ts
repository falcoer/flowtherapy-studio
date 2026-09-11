/** Contrats sérialisés v1, stabilisés au jalon 0.1. */
export interface Ref { id: string; revision: number }
export interface Definition extends Ref {
  schemaVersion: 1;
  name: string;
  description?: string;
  tags?: string[];
  derivedFrom?: Ref;
}
export interface Insets { top: number; right: number; bottom: number; left: number }
export interface Frame { x: number; y: number; width: number; height: number }
export interface Format extends Definition {
  surface: { width: number; height: number; unit: "px" | "mm" };
  zones: {
    bleed: Insets;
    safeInset: Insets;
    exclusions?: Array<Frame & { id: string; label: string }>;
  };
  exports: ExportPreset[];
  defaultExportId: string;
}
export type ExportPreset = {
  id: string; name: string; area: "surface" | "bleed";
} & ({
  type: "raster"; mimeType: "image/png" | "image/jpeg";
  resolution: { mode: "scale"; factor: number } | { mode: "dpi"; value: number };
  background: string | null; quality?: number;
} | {
  type: "pdf"; background: string; cropMarks: boolean; rasterDpi: number;
});
export interface EventRow {
  id: string;
  date: string; // YYYY-MM-DD, date civile
  label: string;
  location: string;
}
export interface AssetRef { assetId: string }
export type Value = string | AssetRef | EventRow[];
export type Field = { id: string; label: string; required: boolean } & (
  { type: "text" | "date" | "url"; defaultValue?: string } |
  { type: "image"; defaultValue?: AssetRef } |
  { type: "collection"; itemSchema: "core:event@1"; minItems: number }
);
export type Source = { field: string } | { value: Value };
export interface Style {
  fill?: string; font?: string; fontSize?: number;
  align?: "left" | "center" | "right";
}
export type Layer = {
  id: string;
  style?: Style;
  editing: { move: boolean; resize: boolean; restyle: boolean; hide: boolean };
} & (
  { type: "text" | "image" | "vector" | "qr"; content: Source } |
  { type: "shape"; shape: "rectangle" | "ellipse" } |
  { type: "event-list"; source: { field: string } }
);
export interface Placement {
  layerId: string;
  frame: Frame;
  rotation: number;
  visible: boolean;
  style?: Style;
  imageFit?: { mode: "cover" | "contain"; focalX: number; focalY: number };
  textFit?: { mode: "error" | "shrink"; minFontSize: number; maxLines: number };
  eventPresentation?: {
    mode: "table" | "list" | "cards";
    columns: Array<{ field: "date" | "label" | "location"; width: number }>;
    dateFormat: "day-month" | "day-month-year";
    rowGap: number;
    overflow: "error" | "compact" | "paginate";
    minFontSize: number;
    minRowGap: number;
  };
}
export interface Layout {
  id: string;
  formatRef: Ref;
  status: "draft" | "validated";
  placements: Placement[]; // ordre de peinture arrière → avant
}
export interface Template extends Definition {
  brandRef?: Ref;
  fields: Field[];
  layers: Layer[];
  layouts: Layout[];
}
export interface Brand extends Definition {
  colors: { [key: string]: string };
  fonts: { [key: string]: AssetRef };
}
export interface Asset {
  id: string;
  path: string; // relatif à la racine de l'archive/catalogue
  mimeType: string;
  sha256: string;
  source: string;
  rights: string;
}
export interface Variant {
  id: string;
  layoutId: string;
  format: Format; // snapshot
  placementOverrides: { [layerId: string]: PlacementOverride };
}
export interface Support {
  id: string;
  name: string;
  template: Template; // snapshot
  bindings: { [key: string]: string }; // champ template → clé contenu campagne
  overrides: { [key: string]: Value };
  eventSelections: { [fieldId: string]: EventSelection };
  variants: Variant[];
}
export interface Campaign {
  schemaVersion: 1;
  id: string;
  revision: number; // concurrence de stockage, distincte de schemaVersion
  name: string;
  locale: string;
  content: { [key: string]: Value };
  brand?: Brand; // snapshot
  assets: Asset[];
  supports: Support[];
}
export interface CampaignStore {
  list(): Promise<Array<Pick<Campaign, "id" | "revision" | "name">>>;
  load(id: string): Promise<Campaign>;
  save(campaign: Campaign, expectedRevision: number | null): Promise<Campaign>;
  delete(id: string, expectedRevision: number): Promise<void>;
}


/** ZIP v1: STORE entries, paths and hashes cover campaign.json and all assets. */
export interface ArchiveManifest {
  archiveVersion: 1;
  files: Array<{ path: string; size: number; sha256: string; mimeType: string }>;
}

export type EventSelection = { mode: "all" } | { mode: "ids"; ids: string[] };
export interface PlacementOverride {
  frame?: Frame;
  rotation?: number;
  visible?: boolean;
  style?: Style;
  imageFit?: Placement["imageFit"];
  textFit?: Placement["textFit"];
  eventPresentation?: Placement["eventPresentation"];
}
