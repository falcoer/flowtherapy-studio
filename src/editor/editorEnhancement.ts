function selectedLayerSelect(): HTMLSelectElement | null {
  const labels = Array.from(document.querySelectorAll<HTMLLabelElement>(".adjustment-panel label"));
  const label = labels.find((item) => item.textContent?.includes("Calque sélectionné"));
  return label?.querySelector("select") ?? null;
}

function labelFor(option: HTMLOptionElement): string {
  const raw = option.textContent?.trim() || option.value;
  return raw === "Image" ? option.value.replace(/[-_]/g, " ") : raw;
}

function syncLayerDock(): void {
  const panel = document.querySelector<HTMLElement>(".adjustment-panel");
  const select = selectedLayerSelect();
  if (!panel || !select) return;

  let dock = panel.querySelector<HTMLElement>("[data-layer-dock]");
  if (!dock) {
    dock = document.createElement("section");
    dock.dataset.layerDock = "true";
    dock.className = "layer-dock";
    const label = select.closest("label");
    label?.before(dock);
  }

  const current = select.value;
  const signature = Array.from(select.options).map((option) => `${option.value}:${option.textContent}`).join("|");
  if (dock.dataset.signature !== signature) {
    dock.dataset.signature = signature;
    dock.innerHTML = `
      <div class="layer-dock-heading">
        <div><span class="eyebrow">ÉLÉMENT SÉLECTIONNÉ</span><strong data-layer-current></strong></div>
        <span class="selection-link">Canvas ↔ Inspecteur</span>
      </div>
      <div class="layer-dock-list" role="listbox" aria-label="Calques de la composition"></div>`;
    const list = dock.querySelector<HTMLElement>(".layer-dock-list")!;
    for (const option of Array.from(select.options)) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.layerChoice = option.value;
      button.setAttribute("role", "option");
      button.textContent = labelFor(option);
      button.addEventListener("click", () => {
        select.value = option.value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });
      list.append(button);
    }
  }

  dock.querySelector<HTMLElement>("[data-layer-current]")!.textContent = labelFor(select.selectedOptions[0]);
  dock.querySelectorAll<HTMLButtonElement>("[data-layer-choice]").forEach((button) => {
    const active = button.dataset.layerChoice === current;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });

  document.querySelectorAll<HTMLElement>("[data-layer]").forEach((node) => {
    const active = node.dataset.layer === current;
    node.classList.toggle("studio-selected-layer", active);
    if (active) node.dataset.selectionLabel = labelFor(select.selectedOptions[0]);
    else delete node.dataset.selectionLabel;
  });
}

export function enableEditorEnhancement(): () => void {
  const sync = () => queueMicrotask(syncLayerDock);
  const observer = new MutationObserver(sync);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-pressed", "value"] });
  document.addEventListener("change", sync, true);
  document.addEventListener("click", (event) => {
    if ((event.target as HTMLElement).closest("[data-layer]")) setTimeout(syncLayerDock, 0);
  }, true);
  syncLayerDock();
  return () => {
    observer.disconnect();
    document.removeEventListener("change", sync, true);
  };
}
