import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import { enablePrototypeLauncher } from "./prototypeLauncher.js";
import "./style.css";

createRoot(document.getElementById("root")!).render(<App />);
enablePrototypeLauncher();
