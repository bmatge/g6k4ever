/**
 * @g6k4ever/editor — back-office no-code React + react-dsfr.
 *
 * Phase 7a livrée : liste/création des simulateurs, éditeur 2-pane (form +
 * preview live), lock avec heartbeat, save/publish. Surface publique exposée
 * pour permettre l'embedding (ex. dans une app interne ministérielle).
 *
 * Phase 7.2 (à venir) : DnD des blocs, mode expert codemirror, vérificateur de
 * cohérence temps réel, autocomplétion `#var`, ajout/suppression de Data.
 */

export const EDITOR_PACKAGE_VERSION = "0.0.0" as const;

export { App } from "./App.js";
export { ApiClient, ApiError, type SimulatorSummary, type SimulatorDetail } from "./api-client.js";
export { createBlankSimulator } from "./templates.js";
