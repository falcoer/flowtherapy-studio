import { lazy, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import "./style.css";
const GraphicStudio = lazy(() =>
  import("../graphics/GraphicStudio.js").then((m) => ({
    default: m.GraphicStudio,
  })),
);
function Root() {
  const [graphic, setGraphic] = useState(location.hash === "#graphique");
  useEffect(() => {
    const sync = () => setGraphic(location.hash === "#graphique");
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  return graphic ? (
    <Suspense fallback={<p>Ouverture de l’atelier…</p>}>
      <GraphicStudio />
    </Suspense>
  ) : (
    <App />
  );
}
createRoot(document.getElementById("root")!).render(<Root />);
