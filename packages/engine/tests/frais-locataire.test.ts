import { describe, it, expect, beforeAll } from "vitest";
import { evaluate, InMemoryDataSource, objectKey } from "../src/index.js";
import { createTestRegistry } from "./test-helpers.js";
import { loadSimulator } from "./fixtures.js";
import type { Simulator } from "@g6k4ever/schema";

/**
 * Golden tests sur `frais-locataire` — test d'acceptation MVP n°1
 * (cf. _corpus/targets.md §4 critère 1).
 *
 * Fixtures de la datasource `zonage-commune` :
 *   - 35238 (Rennes) : zone 1 (tendue), frais 1
 *   - 48095 (Mende)  : zone 0 (reste du territoire), frais 0
 *   - 75056 (Paris)  : zone 2 (très tendue), frais 2
 */

let simulator: Simulator;

const datasources = new InMemoryDataSource();
datasources.register(
  "zonage-commune",
  [
    { codeInsee: "35238", commune: "Rennes", zone: 1, frais: 1 },
    { codeInsee: "48095", commune: "Mende", zone: 0, frais: 0 },
    { codeInsee: "75056", commune: "Paris", zone: 2, frais: 2 },
  ],
  (row, params) => row.codeInsee === params.insee,
);

const functions = createTestRegistry();

beforeAll(() => {
  simulator = loadSimulator("frais-locataire");
});

const evalWith = (input: Record<string, unknown>) =>
  evaluate(simulator, input, { resolvers: { datasources }, functions });

describe("frais-locataire — golden tests", () => {
  it("entrée vide → blockinfo et sections masqués, état stable", () => {
    const state = evalWith({});
    expect(state.stable).toBe(true);
    expect(state.visibility.get(objectKey("blockinfo", "blockinfo-resultats"))).toBe(false);
    expect(state.values.get(2)).toBeUndefined();
    expect(state.values.get(3)).toBeUndefined();
  });

  it("Rennes (35238, zone 1) → section-zone-1 visible, les autres masquées", () => {
    const state = evalWith({ commune: "35238" });
    expect(state.stable).toBe(true);
    expect(state.values.get(1)).toBe("35238");
    expect(state.values.get(2)).toBe(1);
    expect(state.values.get(3)).toBe("Rennes");
    expect(state.visibility.get(objectKey("blockinfo", "blockinfo-resultats"))).toBe(true);
    expect(state.visibility.get(objectKey("section", "section-zone-1"))).toBe(true);
    expect(state.visibility.get(objectKey("section", "section-zone-0"))).toBe(false);
    expect(state.visibility.get(objectKey("section", "section-zone-2"))).toBe(false);
  });

  it("Mende (48095, zone 0) → section-zone-0 visible", () => {
    const state = evalWith({ commune: "48095" });
    expect(state.stable).toBe(true);
    expect(state.values.get(2)).toBe(0);
    expect(state.values.get(3)).toBe("Mende");
    expect(state.visibility.get(objectKey("section", "section-zone-0"))).toBe(true);
    expect(state.visibility.get(objectKey("section", "section-zone-1"))).toBe(false);
    expect(state.visibility.get(objectKey("section", "section-zone-2"))).toBe(false);
  });

  it("Paris (75056, zone 2) → section-zone-2 visible", () => {
    const state = evalWith({ commune: "75056" });
    expect(state.stable).toBe(true);
    expect(state.values.get(2)).toBe(2);
    expect(state.values.get(3)).toBe("Paris");
    expect(state.visibility.get(objectKey("section", "section-zone-2"))).toBe(true);
    expect(state.visibility.get(objectKey("section", "section-zone-0"))).toBe(false);
    expect(state.visibility.get(objectKey("section", "section-zone-1"))).toBe(false);
  });

  it("commune inconnue → source ne résout pas, sections masquées", () => {
    const state = evalWith({ commune: "99999" });
    expect(state.stable).toBe(true);
    expect(state.values.get(2)).toBeUndefined();
    expect(state.values.get(3)).toBeUndefined();
    expect(state.visibility.get(objectKey("blockinfo", "blockinfo-resultats"))).toBe(false);
  });

  it("converge en peu d'itérations (<= 5)", () => {
    const state = evalWith({ commune: "35238" });
    expect(state.iterations).toBeLessThanOrEqual(5);
  });
});
