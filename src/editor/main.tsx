import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import { enablePrototypeLauncher } from "./prototypeLauncher.js";
import { enableEditorEnhancement } from "./editorEnhancement.js";
import "./style.css";
import "./editor-enhancement.css";

createRoot(document.getElementById("root")!).render(<App />);
enablePrototypeLauncher();
enableEditorEnhancement();
