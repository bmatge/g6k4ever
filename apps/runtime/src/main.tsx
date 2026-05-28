import { startReactDsfr } from "@codegouvfr/react-dsfr/spa";
import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import { DemoApp } from "./DemoApp.js";

// Initialisation DSFR — uniquement en mode standalone. En mode `embedded`
// (intégré dans un portail DSFR existant), cet appel est skipé.
startReactDsfr({ defaultColorScheme: "light" });

const container = document.getElementById("root");
if (!container) throw new Error("Élément #root introuvable");
createRoot(container).render(
  <StrictMode>
    <DemoApp />
  </StrictMode>,
);
