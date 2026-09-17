import { ARCHIVE_LIMITS, importZIP } from "../storage/archive.js";
import { IndexedDBCampaignStore } from "../storage/indexeddb.js";

const PROTOTYPE_PATH = "prototypes/flowtherapy-viability.zip";
const PROTOTYPE_PREVIEW = /\/previews\/(?:pr-19|branch-proto-viability-01-runtime)\//;
const LIVE_ID = "prototype:flowtherapy-viability-live";
let autoLoadStarted = false;

function findStoredCampaignSelect(): HTMLSelectElement | null {
  const labels = Array.from(document.querySelectorAll<HTMLLabelElement>("label"));
  const label = labels.find((item) => item.textContent?.includes("Campagne enregistrée"));
  return label?.querySelector("select") ?? null;
}

function findButton(root: ParentNode, text: string): HTMLButtonElement | null {
  return Array.from(root.querySelectorAll<HTMLButtonElement>("button"))
    .find((button) => button.textContent?.trim() === text) ?? null;
}

async function waitForOption(id: string, timeoutMs = 5000): Promise<HTMLSelectElement> {
  const start = performance.now();
  while (performance.now() - start < timeoutMs) {
    const select = findStoredCampaignSelect();
    if (select && Array.from(select.options).some((option) => option.value === id)) return select;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("La campagne prototype a été importée mais ne peut pas être ouverte dans l’interface.");
}

async function openStoredCampaign(id: string): Promise<void> {
  const select = findStoredCampaignSelect();
  const panel = select?.closest<HTMLElement>(".content-panel") ?? document;
  const refresh = findButton(panel, "Actualiser");
  refresh?.click();

  const currentSelect = await waitForOption(id);
  currentSelect.value = id;
  currentSelect.dispatchEvent(new Event("change", { bubbles: true }));

  const currentPanel = currentSelect.closest<HTMLElement>(".content-panel") ?? document;
  const open = findButton(currentPanel, "Ouvrir");
  if (!open) throw new Error("Commande d’ouverture de campagne introuvable.");

  const originalConfirm = window.confirm;
  window.confirm = () => true;
  try {
    open.click();
  } finally {
    window.confirm = originalConfirm;
  }
}

async function loadPrototype(button: HTMLButtonElement): Promise<void> {
  button.disabled = true;
  const original = button.textContent;
  button.textContent = "Chargement PROTO-01…";
  try {
    const response = await fetch(new URL(PROTOTYPE_PATH, document.baseURI), { cache: "no-store" });
    if (!response.ok) throw new Error(`Prototype indisponible (${response.status}).`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > ARCHIVE_LIMITS.bytes) throw new Error("Prototype trop volumineux.");

    const bundle = await importZIP(bytes);
    bundle.campaign.id = LIVE_ID;
    bundle.campaign.revision = 1;

    const store = new IndexedDBCampaignStore();
    try {
      const existing = (await store.list()).find((item) => item.id === LIVE_ID);
      await store.saveBundle(bundle, existing?.revision ?? null);
    } finally {
      await store.close().catch(() => {});
    }

    await openStoredCampaign(LIVE_ID);
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

function installLauncher(): void {
  const actions = document.querySelector<HTMLElement>(".workspace-fieldset .toolbar .actions");
  if (!actions) return;

  let button = actions.querySelector<HTMLButtonElement>("[data-proto-launcher]");
  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.dataset.protoLauncher = "true";
    button.className = "primary";
    button.textContent = "Tester PROTO-01";
    button.title = "Charge la campagne de viabilité Flow Therapy avec ses ressources réelles.";
    button.addEventListener("click", () => {
      void loadPrototype(button!).catch((error) => {
        window.alert(error instanceof Error ? error.message : String(error));
      });
    });
    actions.prepend(button);
  }

  if (PROTOTYPE_PREVIEW.test(location.pathname) && !autoLoadStarted) {
    autoLoadStarted = true;
    queueMicrotask(() => {
      void loadPrototype(button!).catch((error) => {
        autoLoadStarted = false;
        window.alert(error instanceof Error ? error.message : String(error));
      });
    });
  }
}

export function enablePrototypeLauncher(): () => void {
  installLauncher();
  const observer = new MutationObserver(installLauncher);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("hashchange", installLauncher);
  return () => {
    observer.disconnect();
    window.removeEventListener("hashchange", installLauncher);
  };
}
