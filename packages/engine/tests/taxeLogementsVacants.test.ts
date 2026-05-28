import { describe, it, expect, beforeAll } from "vitest";
import { evaluate, InMemoryDataSource, objectKey } from "../src/index.js";
import { createTestRegistry } from "./test-helpers.js";
import { loadSimulator } from "./fixtures.js";
import type { Simulator } from "@g6k4ever/schema";

/**
 * Golden tests sur `taxeLogementsVacants` — test d'acceptation MVP n°2
 * (cf. _corpus/targets.md §4 critère 2).
 *
 * Cas test :
 *   - Paris (75056) : commune en déséquilibre → TLV s'applique
 *   - Marseille (13055) : commune > 50k habitants → TLV s'applique
 *   - Mende (48095) : ni l'un ni l'autre → TLV ne s'applique pas
 *   - commune inconnue : sources renvoient null → TLV ne s'applique pas
 */

let simulator: Simulator;

const INSEE_MAP: Record<string, string> = {
  Paris: "75056",
  Marseille: "13055",
  Mende: "48095",
};
const NOM_MAP: Record<string, string> = {
  Paris: "Paris",
  Marseille: "Marseille",
  Mende: "Mende",
};

const datasources = new InMemoryDataSource();
datasources.register(
  "plus-de-50000",
  [
    { codeInsee: "13055", Ok: "1" }, // Marseille > 50k
    { codeInsee: "75056", Ok: "1" }, // Paris > 50k
  ],
  (row, params) => row.codeInsee === params.codeInsee,
);
datasources.register(
  "desequilibre-offre-demande",
  [
    { codeInsee: "75056", id: 1, Nom: "Paris", Ok: "1" }, // Paris en déséquilibre
  ],
  (row, params) => row.codeInsee === params.codeInsee,
);

const functions = createTestRegistry();
functions.register("getInsee", (args: unknown[]) => INSEE_MAP[String(args[0])] ?? null);
functions.register("getNomVille", (args: unknown[]) => NOM_MAP[String(args[0])] ?? null);

beforeAll(() => {
  simulator = loadSimulator("taxeLogementsVacants");
});

const evalWith = (input: Record<string, unknown>) =>
  evaluate(simulator, input, { resolvers: { datasources }, functions, maxIterations: 15 });

describe("taxeLogementsVacants — golden tests", () => {
  it("entrée vide → bouton restart caché, chapitres TLV masqués", () => {
    const state = evalWith({});
    expect(state.stable).toBe(true);
    expect(state.visibility.get(objectKey("action", "action-restart"))).toBe(false);
    expect(state.visibility.get(objectKey("chapter", "chapter-tlv-applique"))).toBe(false);
    expect(state.visibility.get(objectKey("chapter", "chapter-tlv-non-applique"))).toBe(false);
  });

  it("Paris (déséquilibre + >50k) → TLV s'applique", () => {
    const state = evalWith({ commune: "Paris" });
    expect(state.stable).toBe(true);
    expect(state.values.get(5)).toBe("75056");
    expect(state.values.get(3)).toBe("Paris");
    expect(state.values.get(6)).toBe("1"); // >50k
    expect(state.values.get(7)).toBe("1"); // déséquilibre
    expect(state.values.get(4)).toBe(true); // RecevableTaxeLogementVacant
    expect(state.visibility.get(objectKey("chapter", "chapter-tlv-applique"))).toBe(true);
    expect(state.visibility.get(objectKey("chapter", "chapter-tlv-non-applique"))).toBe(false);
  });

  it("Marseille (>50k seulement) → TLV s'applique aussi", () => {
    const state = evalWith({ commune: "Marseille" });
    expect(state.stable).toBe(true);
    expect(state.values.get(5)).toBe("13055");
    expect(state.values.get(6)).toBe("1"); // >50k
    expect(state.values.get(7)).toBeUndefined(); // pas en déséquilibre
    expect(state.values.get(4)).toBe(true); // any() satisfait par #6=1
    expect(state.visibility.get(objectKey("chapter", "chapter-tlv-applique"))).toBe(true);
    expect(state.visibility.get(objectKey("chapter", "chapter-tlv-non-applique"))).toBe(false);
  });

  it("Mende (ni l'un ni l'autre) → TLV ne s'applique pas", () => {
    const state = evalWith({ commune: "Mende" });
    expect(state.stable).toBe(true);
    expect(state.values.get(5)).toBe("48095");
    expect(state.values.get(6)).toBeUndefined();
    expect(state.values.get(7)).toBeUndefined();
    expect(state.values.get(4)).toBe(false);
    expect(state.visibility.get(objectKey("chapter", "chapter-tlv-applique"))).toBe(false);
    expect(state.visibility.get(objectKey("chapter", "chapter-tlv-non-applique"))).toBe(true);
  });

  it("commune inconnue → sources renvoient null → TLV ne s'applique pas", () => {
    const state = evalWith({ commune: "Ville-Imaginaire" });
    expect(state.stable).toBe(true);
    expect(state.values.get(5)).toBeNull();
    expect(state.values.get(6)).toBeUndefined();
    expect(state.values.get(7)).toBeUndefined();
  });

  it("converge en peu d'itérations (<= 10)", () => {
    const state = evalWith({ commune: "Paris" });
    expect(state.iterations).toBeLessThanOrEqual(10);
  });
});
