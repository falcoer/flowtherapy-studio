import { useEffect, useRef, useState } from "react";
import type { Campaign, EditorialDocument, Support } from "../domain/model.js";
import {
  campaignContent,
  editorialKey,
  validateCampaign,
} from "../domain/core.js";
import {
  bindEditorialField,
  compatibleContent,
  editorialKinds,
  removeEditorial,
} from "../domain/editorial.js";
import type { CampaignBundle } from "../storage/indexeddb.js";
import { IndexedDBCampaignStore } from "../storage/indexeddb.js";
import { selectEditorial } from "../storage/editorial.js";

function contentLabel(campaign: Campaign, key: string): string {
  if (key === "editorial:events")
    return "Tous les événements éditoriaux sélectionnés";
  for (const d of campaign.editorial ?? []) {
    for (const [field, label] of Object.entries({
      title: "Titre",
      summary: "Résumé",
      body: "Corps (texte)",
      events: "Événement",
    })) {
      if (key === editorialKey(d.id, field))
        return `${d.title} · ${label} · r${d.revision}`;
    }
    for (const a of d.assets)
      if (key === editorialKey(d.id, `image:${a.id}`))
        return `${d.title} · ${a.source}`;
  }
  return key === "title"
    ? "Titre commun de campagne"
    : key === "events"
      ? "Événements saisis dans la campagne"
      : key;
}
export function CampaignEditorial({
  bundle,
  onChange,
  active,
}: {
  bundle: CampaignBundle;
  onChange: (bundle: CampaignBundle) => void;
  active: boolean;
}) {
  const [store] = useState(() => new IndexedDBCampaignStore());
  const [documents, setDocuments] = useState<EditorialDocument[]>([]),
    [selected, setSelected] = useState("");
  const [query, setQuery] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const campaign = bundle.campaign;
  const latest = useRef(bundle);
  latest.current = bundle;
  async function refresh() {
    setDocuments(await store.listEditorial());
  }
  useEffect(() => {
    if (active) void refresh().catch((e) => setError(String(e)));
  }, [active, store]);
  useEffect(
    () => () => {
      void store.close().catch(() => {});
    },
    [store],
  );
  const available = documents.filter(
    (d) =>
      d.status !== "archived" &&
      !campaign.editorial?.some((s) => s.id === d.id) &&
      `${d.title} ${d.tags.join(" ")}`
        .toLocaleLowerCase("fr")
        .includes(query.toLocaleLowerCase("fr")),
  );
  function change(fn: (campaign: Campaign) => Campaign) {
    try {
      const next = fn(campaign);
      validateCampaign(next);
      onChange({ ...bundle, campaign: next });
      setError("");
    } catch (e) {
      setError(
        `${String(e)} Retirez ou modifiez d’abord les liaisons concernées.`,
      );
    }
  }
  return (
    <section
      className="campaign-editorial"
      aria-label="Contenus éditoriaux de campagne"
    >
      <h3>Contenus éditoriaux sélectionnés</h3>
      {error && <p role="alert">{error}</p>}
      {(campaign.editorial ?? []).map((d, index, list) => (
        <div className="editorial-selection" key={d.id}>
          <strong>{d.title}</strong>
          <span>
            {editorialKinds[d.kind]} · r{d.revision}
          </span>
          <div className="actions">
            <button
              disabled={busy || !index}
              aria-label={`Monter le contenu ${index + 1}`}
              onClick={() =>
                change((c) => {
                  const n = structuredClone(c);
                  [n.editorial![index - 1], n.editorial![index]] = [
                    n.editorial![index],
                    n.editorial![index - 1],
                  ];
                  return n;
                })
              }
            >
              ↑
            </button>
            <button
              disabled={busy || index === list.length - 1}
              aria-label={`Descendre le contenu ${index + 1}`}
              onClick={() =>
                change((c) => {
                  const n = structuredClone(c);
                  [n.editorial![index], n.editorial![index + 1]] = [
                    n.editorial![index + 1],
                    n.editorial![index],
                  ];
                  return n;
                })
              }
            >
              ↓
            </button>
            <button
              disabled={busy}
              aria-label={`Retirer ${d.title} de la campagne`}
              onClick={() => change((c) => removeEditorial(c, d.id))}
            >
              Retirer
            </button>
          </div>
        </div>
      ))}
      <label>
        Rechercher dans l’éditorial
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected("");
          }}
        />
      </label>
      <label>
        Contenu éditorial à sélectionner
        <select
          value={available.some((d) => d.id === selected) ? selected : ""}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">Choisir…</option>
          {available.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title} · {editorialKinds[d.kind]} · r{d.revision}
            </option>
          ))}
        </select>
      </label>
      <div className="actions">
        <button
          disabled={busy || !available.some((d) => d.id === selected)}
          onClick={() => {
            setBusy(true);
            setError("");
            void selectEditorial(
              bundle,
              available.find((d) => d.id === selected)!,
              store,
            )
              .then((next) => {
                if (latest.current !== bundle)
                  throw new Error(
                    "La campagne a changé pendant la sélection. Réessayez.",
                  );
                onChange(next);
                setSelected("");
              })
              .catch((e) => setError(String(e)))
              .finally(() => setBusy(false));
          }}
        >
          Sélectionner le contenu
        </button>
        <button
          disabled={busy}
          onClick={() => void refresh().catch((e) => setError(String(e)))}
        >
          Actualiser l’éditorial
        </button>
      </div>
      <p className="hint">
        Copies identifiées par révision, avec leurs ressources. Les
        modifications du référentiel ne sont jamais appliquées automatiquement.
      </p>
    </section>
  );
}
export function ContentBindings({
  bundle,
  support,
  onChange,
}: {
  bundle: CampaignBundle;
  support: Support;
  onChange: (bundle: CampaignBundle) => void;
}) {
  const [error, setError] = useState("");
  let pool: ReturnType<typeof campaignContent> = {};
  try {
    pool = campaignContent(bundle.campaign);
  } catch {
    /* Existing validation reports invalid draft data. */
  }
  return (
    <details className="editorial-details" open>
      <summary>Contenus utilisés par ce support</summary>
      {error && <p role="alert">{error}</p>}
      {support.template.fields.map((field) => (
        <label key={field.id}>
          Contenu pour {field.label}
          <select
            aria-label={`Contenu pour ${field.label}`}
            value={support.bindings[field.id] ?? ""}
            onChange={(e) => {
              if (
                (Object.hasOwn(support.overrides, field.id) ||
                  support.eventSelections[field.id]) &&
                !window.confirm(
                  "Remplacer aussi la valeur locale et la sélection d’événements de ce champ ?",
                )
              )
                return;
              try {
                let campaign: Campaign;
                if (e.target.value)
                  campaign = bindEditorialField(
                    bundle.campaign,
                    support.id,
                    field.id,
                    e.target.value,
                  );
                else {
                  campaign = structuredClone(bundle.campaign);
                  const s = campaign.supports.find((s) => s.id === support.id)!;
                  delete s.bindings[field.id];
                  delete s.overrides[field.id];
                  delete s.eventSelections[field.id];
                  validateCampaign(campaign);
                }
                onChange({ ...bundle, campaign });
                setError("");
              } catch (error) {
                setError(String(error));
              }
            }}
          >
            <option value="">Valeur par défaut du template</option>
            {Object.entries(pool)
              .filter(([, value]) => compatibleContent(field, value))
              .map(([key]) => (
                <option key={key} value={key}>
                  {contentLabel(bundle.campaign, key)}
                </option>
              ))}
          </select>
          {Object.hasOwn(support.overrides, field.id) && (
            <small>
              Une valeur locale remplace actuellement cette liaison.
            </small>
          )}
        </label>
      ))}
    </details>
  );
}
