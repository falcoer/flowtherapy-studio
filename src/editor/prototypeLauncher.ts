const PROTOTYPE_PATH = "prototypes/flowtherapy-viability.zip";

function portableInput(): HTMLInputElement | null {
  return document.querySelector<HTMLInputElement>('input[type="file"][accept=".json,.zip"]');
}

async function loadPrototype(button: HTMLButtonElement): Promise<void> {
  const input = portableInput();
  if (!input) throw new Error("Le chargeur de campagne n’est pas disponible dans cette vue.");

  button.disabled = true;
  const original = button.textContent;
  button.textContent = "Chargement PROTO-01…";
  try {
    const response = await fetch(new URL(PROTOTYPE_PATH, document.baseURI));
    if (!response.ok) throw new Error(`Prototype indisponible (${response.status}).`);
    const blob = await response.blob();
    const file = new File([blob], "flowtherapy-viability.zip", { type: "application/zip" });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

function installLauncher(): void {
  const actions = document.querySelector<HTMLElement>(".workspace-fieldset .toolbar .actions");
  if (!actions || actions.querySelector("[data-proto-launcher]")) return;

  const button = document.createElement("button");
  button.type = "button";
  button.dataset.protoLauncher = "true";
  button.className = "primary";
  button.textContent = "Tester PROTO-01";
  button.title = "Charge la campagne de viabilité Flow Therapy avec ses ressources réelles.";
  button.addEventListener("click", () => {
    void loadPrototype(button).catch((error) => {
      window.alert(error instanceof Error ? error.message : String(error));
    });
  });
  actions.prepend(button);
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
