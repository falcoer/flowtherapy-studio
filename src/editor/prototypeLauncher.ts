const PROTOTYPE_PATH = "prototypes/flowtherapy-viability.zip";
const PROTOTYPE_PREVIEW = /\/previews\/(?:pr-19|branch-proto-viability-01-runtime)\//;
let autoLoadStarted = false;

function portableInput(): HTMLInputElement | null {
  return document.querySelector<HTMLInputElement>('input[type="file"][accept=".json,.zip"]');
}

async function loadPrototype(button: HTMLButtonElement, automatic = false): Promise<void> {
  const input = portableInput();
  if (!input) throw new Error("Le chargeur de campagne n’est pas disponible dans cette vue.");

  button.disabled = true;
  const original = button.textContent;
  button.textContent = "Chargement PROTO-01…";
  try {
    const response = await fetch(new URL(PROTOTYPE_PATH, document.baseURI), { cache: "no-store" });
    if (!response.ok) throw new Error(`Prototype indisponible (${response.status}).`);
    const blob = await response.blob();
    const file = new File([blob], "flowtherapy-viability.zip", { type: "application/zip" });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;

    // A fresh Studio document is intentionally considered modified. On dedicated
    // prototype preview URLs, skip only that initial discard confirmation so the
    // preview opens directly on the viability scenario.
    const originalConfirm = window.confirm;
    if (automatic) window.confirm = () => true;
    try {
      input.dispatchEvent(new Event("change", { bubbles: true }));
    } finally {
      if (automatic) window.confirm = originalConfirm;
    }
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
      void loadPrototype(button!, true).catch((error) => {
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
