import { describe, it, expect } from "vitest";
import { createApp, createDb, runMigrations } from "../src/index.js";

/**
 * Simulateur de test : variante de `frais-locataire` avec une datasource
 * `inline` (la version `database` du corpus ne peut pas être résolue sans
 * connexion externe — réservée à Phase 5.2).
 */
const testSimulator = {
  schemaVersion: 1,
  metadata: {
    name: "frais-locataire-inline",
    label: "Test inline source",
    defaultLocale: "fr-FR",
    dateFormat: "dd/MM/yyyy",
    authors: [],
  },
  outputKind: "decision",
  data: [
    { id: 1, name: "commune", label: "Commune", type: "text" },
    {
      id: 2,
      name: "frais",
      label: "Frais",
      type: "integer",
      source: { sourceId: "zonage", returnPath: "frais" },
    },
    {
      id: 3,
      name: "nomCommune",
      label: "Nom",
      type: "text",
      source: { sourceId: "zonage", returnPath: "commune" },
    },
  ],
  sources: [
    {
      kind: "inline",
      id: "zonage",
      label: "Zonage",
      columns: [
        { name: "insee", type: "text" },
        { name: "commune", type: "text" },
        { name: "frais", type: "integer" },
      ],
      rows: [
        { insee: "35238", commune: "Rennes", frais: 1 },
        { insee: "75056", commune: "Paris", frais: 2 },
        { insee: "48095", commune: "Mende", frais: 0 },
      ],
    },
  ],
  // NOTE : pas de `parameters` sur la source ci-dessus → l'inline resolver
  // matche la 1re ligne quand aucun paramètre n'est fourni. Voir
  // `testSimulatorWithParam` plus bas pour la version paramétrée.
  steps: [{ id: 1, name: "zonage", label: "Zonage", blocks: [] }],
  rules: [
    {
      id: "R1",
      name: "Affiche le résultat",
      conditions: {
        kind: "connector",
        type: "all",
        children: [
          { kind: "condition", operand: 3, operator: "present" },
          { kind: "condition", operand: 2, operator: "present" },
        ],
      },
      ifActions: [
        { kind: "showObject", target: { type: "blockinfo", id: "result" } },
      ],
      elseActions: [
        { kind: "hideObject", target: { type: "blockinfo", id: "result" } },
      ],
    },
  ],
  footnotes: [],
};

// ⚠️ Adapter du resolver inline : la source `zonage` paramètre n'est pas mappé
// car notre Data 2 et 3 n'ont pas de paramètre déclaré dans la source. Pour ce
// test, le resolver inline matche la 1re ligne quand aucun paramètre fourni.
// Plus tard, on ajoutera un paramètre `insee` lié à `#1`.

/**
 * Variante avec paramètre `insee` lié à `#1` — comportement réaliste : la
 * source ne résout que lorsque `commune` (Data 1) est défini.
 */
const testSimulatorWithParam = {
  ...testSimulator,
  sources: [
    {
      kind: "inline",
      id: "zonage",
      label: "Zonage",
      columns: testSimulator.sources[0]!.columns,
      rows: testSimulator.sources[0]!.rows,
      parameters: [{ name: "insee", type: "text", position: 1, bindToDataId: 1 }],
    },
  ],
};

describe("API — POST /run-stateless", () => {
  // createApp() ouvre une DB. Pour ces tests stateless on utilise :memory:.
  const { db, raw } = createDb({ url: ":memory:", enableWal: false });
  runMigrations(raw);
  const { app } = createApp({ db });

  it("GET / renvoie l'identité de l'API", async () => {
    const res = await app.request("/");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { name: string };
    expect(body.name).toBe("@g6k4ever/api");
  });

  it("GET /healthz renvoie 200 ok", async () => {
    const res = await app.request("/healthz");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("POST /run-stateless avec body vide → 400", async () => {
    const res = await app.request("/run-stateless", { method: "POST" });
    expect(res.status).toBe(400);
  });

  it("POST /run-stateless avec simulator invalide → 400 + details", async () => {
    const res = await app.request("/run-stateless", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ simulator: { wrong: true }, input: {} }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; details?: unknown };
    expect(body.error).toMatch(/invalide/);
    expect(body.details).toBeDefined();
  });

  it("POST /run-stateless avec input non-objet → 400", async () => {
    const res = await app.request("/run-stateless", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ simulator: testSimulatorWithParam, input: "wrong" }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /run-stateless avec input vide → stable, blockinfo masqué", async () => {
    const res = await app.request("/run-stateless", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ simulator: testSimulatorWithParam, input: {} }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      state: {
        stable: boolean;
        visibility: Record<string, boolean>;
        values: Record<string, unknown>;
        iterations: number;
      };
    };
    expect(body.state.stable).toBe(true);
    expect(body.state.visibility["blockinfo:result"]).toBe(false);
  });

  it("POST /run-stateless avec commune Rennes (35238) → source résolue", async () => {
    // Note: la source du test n'a pas de paramètre déclaré, le matcher inline
    // renvoie la première ligne (Rennes). Test démontre le pipeline complet.
    const res = await app.request("/run-stateless", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        simulator: testSimulatorWithParam,
        input: { commune: "35238" },
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      state: {
        stable: boolean;
        values: Record<string, unknown>;
        visibility: Record<string, boolean>;
      };
    };
    expect(body.state.stable).toBe(true);
    expect(body.state.values["1"]).toBe("35238");
    // Source sans paramètre → 1re ligne (Rennes).
    expect(body.state.values["2"]).toBe(1);
    expect(body.state.values["3"]).toBe("Rennes");
    expect(body.state.visibility["blockinfo:result"]).toBe(true);
  });
});
