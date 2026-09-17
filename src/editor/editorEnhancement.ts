function labelsIn(selector: string): HTMLLabelElement[] {
  return Array.from(document.querySelectorAll<HTMLLabelElement>(`${selector} label`));
}

function labelContaining(selector: string, text: string): HTMLLabelElement | undefined {
  return labelsIn(selector).find((item) => item.textContent?.includes(text));
}

function selectedLayerSelect(): HTMLSelectElement | null {
  return labelContaining(".adjustment-panel", "Calque sélectionné")?.querySelector("select") ?? null;
}

function variantSelect(): HTMLSelectElement | null {
  return labelContaining(".adjustment-panel", "Variante active")?.querySelector("select") ?? null;
}

function labelFor(option: HTMLOptionElement): string {
  const raw = option.textContent?.trim() || option.value;
  return raw === "Image" ? option.value.replace(/[-_]/g, " ") : raw;
}

function selectedCanvasLayer(id: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-layer="${CSS.escape(id)}"]`);
}

function imageResourceSelectForLayer(id: string): HTMLSelectElement | null {
  const imageLayers = Array.from(document.querySelectorAll<HTMLElement>(".resolved-surface [data-layer]"))
    .filter((node) => !!node.querySelector("img"));
  const index = imageLayers.findIndex((node) => node.dataset.layer === id);
  if (index < 0) return null;
  const selects = Array.from(document.querySelectorAll<HTMLSelectElement>(".asset-slots select"));
  return selects[index] ?? null;
}

function syncResourceInspector(panel: HTMLElement, current: string): void {
  let inspector = panel.querySelector<HTMLElement>("[data-resource-inspector]");
  const source = imageResourceSelectForLayer(current);
  const layerNode = selectedCanvasLayer(current);
  if (!source || !layerNode) {
    inspector?.remove();
    return;
  }
  if (!inspector) {
    inspector = document.createElement("section");
    inspector.dataset.resourceInspector = "true";
    inspector.className = "resource-inspector";
    panel.querySelector("[data-layer-dock]")?.after(inspector);
  }
  const signature = `${current}|${Array.from(source.options).map((option) => `${option.value}:${option.textContent}`).join("|")}`;
  if (inspector.dataset.signature !== signature) {
    inspector.dataset.signature = signature;
    inspector.innerHTML = `
      <div class="resource-inspector-heading">
        <div><span class="eyebrow">RESSOURCE</span><strong>Image de l’élément</strong></div>
        <div class="resource-current-preview"></div>
      </div>
      <label>Remplacer l’image
        <select data-resource-proxy aria-label="Ressource de l’élément sélectionné"></select>
      </label>`;
    const proxy = inspector.querySelector<HTMLSelectElement>("[data-resource-proxy]")!;
    for (const option of Array.from(source.options)) proxy.add(option.cloneNode(true) as HTMLOptionElement);
    proxy.addEventListener("change", () => {
      source.value = proxy.value;
      source.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }
  const proxy = inspector.querySelector<HTMLSelectElement>("[data-resource-proxy]")!;
  proxy.value = source.value;
  const preview = inspector.querySelector<HTMLElement>(".resource-current-preview")!;
  preview.replaceChildren();
  const image = layerNode.querySelector<HTMLImageElement>("img");
  if (image) {
    const clone = image.cloneNode() as HTMLImageElement;
    clone.alt = "Ressource actuelle";
    preview.append(clone);
  }
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
  syncResourceInspector(panel, current);
}

function proxyClick(target: Element | null): void {
  (target as HTMLElement | null)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function syncPaletteNavigation(): void {
  const panel = document.querySelector<HTMLElement>(".content-panel");
  if (!panel || panel.querySelector("[data-palette-navigation]")) return;
  panel.classList.add("studio-palette");
  const navigation = document.createElement("nav");
  navigation.dataset.paletteNavigation = "true";
  navigation.className = "palette-navigation";
  navigation.setAttribute("aria-label", "Palette du Studio");
  const items = [
    ["Contenu", () => proxyClick(labelContaining(".content-panel", "Nom de la campagne") ?? null)],
    ["Événements", () => proxyClick(panel.querySelector(".events"))],
    ["Ressources", () => proxyClick(document.querySelector("[data-resource-inspector], .asset-slots"))],
    ["Templates", () => proxyClick(labelContaining(".adjustment-panel", "Template") ?? null)],
    ["Calques", () => proxyClick(document.querySelector("[data-layer-dock]"))],
  ] as const;
  for (const [label, action] of items) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", action);
    navigation.append(button);
  }
  panel.prepend(navigation);
}

function syncFormatDock(): void {
  const canvas = document.querySelector<HTMLElement>(".canvas-panel");
  const source = variantSelect();
  if (!canvas || !source) return;
  let dock = canvas.querySelector<HTMLElement>("[data-format-dock]");
  if (!dock) {
    dock = document.createElement("div");
    dock.dataset.formatDock = "true";
    dock.className = "format-dock";
    canvas.append(dock);
  }
  const signature = Array.from(source.options).map((option) => `${option.value}:${option.textContent}`).join("|");
  if (dock.dataset.signature !== signature) {
    dock.dataset.signature = signature;
    dock.replaceChildren();
    const label = document.createElement("span");
    label.className = "format-dock-label";
    label.textContent = "Formats";
    dock.append(label);
    for (const option of Array.from(source.options)) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.formatChoice = option.value;
      button.textContent = option.textContent?.trim() || option.value;
      button.addEventListener("click", () => {
        source.value = option.value;
        source.dispatchEvent(new Event("change", { bubbles: true }));
      });
      dock.append(button);
    }
  }
  dock.querySelectorAll<HTMLButtonElement>("[data-format-choice]").forEach((button) => {
    const active = button.dataset.formatChoice === source.value;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function syncStudioShell(): void {
  const workspace = document.querySelector<HTMLElement>(".workspace");
  const canvas = document.querySelector<HTMLElement>(".canvas-panel");
  const inspector = document.querySelector<HTMLElement>(".adjustment-panel");
  if (!workspace || !canvas || !inspector) return;
  workspace.classList.add("studio-shell");
  canvas.classList.add("studio-canvas-workbench");
  inspector.classList.add("studio-inspector");
  syncPaletteNavigation();
  syncFormatDock();
}

function syncAll(): void {
  syncStudioShell();
  syncLayerDock();
  syncFormatDock();
}

export function enableEditorEnhancement(): () => void {
  const sync = () => queueMicrotask(syncAll);
  const observer = new MutationObserver(sync);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-pressed", "value", "src"] });
  document.addEventListener("change", sync, true);
  document.addEventListener("click", (event) => {
    if ((event.target as HTMLElement).closest("[data-layer]")) setTimeout(syncAll, 0);
  }, true);
  syncAll();
  return () => {
    observer.disconnect();
    document.removeEventListener("change", sync, true);
  };
}
