import "@codegouvfr/react-dsfr/dsfr/dsfr.min.css";
import "@codegouvfr/react-dsfr/dsfr/utility/icons/icons.min.css";

import { startReactDsfr } from "@codegouvfr/react-dsfr/spa";
import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import { App } from "./App.js";

startReactDsfr({ defaultColorScheme: "light" });

const container = document.getElementById("root");
if (!container) throw new Error("Élément #root introuvable");
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
