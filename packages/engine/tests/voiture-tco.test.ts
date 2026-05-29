import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Simulator as SimulatorSchema, type Simulator } from "@g6k4ever/schema";
import { evaluate, InMemoryDataSource } from "../src/index.js";
import { createTestRegistry } from "./test-helpers.js";

/**
 * Test d'acceptation portail-elec : voiture-tco.
 *
 * Vérifie que le simulateur produit un TCO cohérent avec les calculs attendus
 * pour un jeu de paramètres canonique.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const corpusPath = resolve(__dirname, "..", "..", "..", "_corpus", "portail-elec", "voiture-tco.json");

let simulator: Simulator;

const functions = createTestRegistry();
// Ajoute les fonctions financières + select qu'on a déclarées en standard.
functions.register("pv", (args: unknown[]) => {
  const rate = Number(args[0]);
  const periods = Number(args[1]);
  const payment = Number(args[2]);
  if (rate === 0) return payment * periods;
  return (payment * (1 - Math.pow(1 + rate, -periods))) / rate;
});
functions.register("select", (args: unknown[]) => {
  const value = args[0];
  const rest = args.slice(1);
  for (let i = 0; i + 1 < rest.length; i += 2) {
    if (String(rest[i]) === String(value)) return rest[i + 1];
  }
  if (rest.length % 2 === 1) return rest[rest.length - 1];
  return undefined;
});

// Resolver pour la source `bareme-bonus` (inline)
const datasources = new InMemoryDataSource();
datasources.register(
  "bareme-bonus",
  [
    { cat: 0, montant: 7000 },
    { cat: 1, montant: 4000 },
    { cat: 2, montant: 2000 },
    { cat: 3, montant: 0 },
  ],
  (row, params) => String(row.cat) === String(params.cat),
);

beforeAll(() => {
  const raw = JSON.parse(readFileSync(corpusPath, "utf-8")) as unknown;
  const parsed = SimulatorSchema.safeParse(raw);
  if (!parsed.success) {
    console.error(JSON.stringify(parsed.error.format(), null, 2));
    throw new Error("voiture-tco.json invalide");
  }
  simulator = parsed.data;
});

const evalWith = (input: Record<string, unknown>) =>
  evaluate(simulator, input, {
    resolvers: { datasources },
    functions,
    maxIterations: 20,
  });

describe("voiture-tco — calculs canoniques", () => {
  it("la définition charge et passe safeParse", () => {
    expect(simulator).toBeDefined();
    expect(simulator.metadata.name).toBe("voiture-tco");
  });

  it("paramètres défauts : 12 000 km/an, 5 ans, RFR cat 1 → bonus 4000", () => {
    const state = evalWith({
      km: 12000,
      duree: 5,
      prixVE: 35000,
      prixTH: 25000,
      consoVE: 16,
      consoTH: 6.5,
      rfrCat: "1",
      pkwh: 0.2,
      pessence: 1.9,
    });
    expect(state.stable).toBe(true);

    // Bonus appliqué : RFR cat 1 → 4000
    expect(state.values.get(100)).toBe(4000);
    // Acquisition VE nette : 35 000 - 4 000 = 31 000
    expect(state.values.get(200)).toBe(31000);
    // Acquisition TH : 25 000
    expect(state.values.get(201)).toBe(25000);

    // Coût énergie VE annuel : 12000 / 100 * 16 * 0.20 = 384
    expect(state.values.get(202)).toBeCloseTo(384, 1);
    // Coût carburant TH annuel : 12000 / 100 * 6.5 * 1.90 = 1482
    expect(state.values.get(203)).toBeCloseTo(1482, 1);

    // Coût énergie VE total : 384 * 5 = 1 920
    expect(state.values.get(204)).toBeCloseTo(1920, 1);
    // Coût carburant TH total : 1 482 * 5 = 7 410
    expect(state.values.get(205)).toBeCloseTo(7410, 1);

    // TCO VE : 31 000 + 1 920 = 32 920
    expect(state.values.get(300)).toBeCloseTo(32920, 1);
    // TCO TH : 25 000 + 7 410 = 32 410
    expect(state.values.get(301)).toBeCloseTo(32410, 1);

    // Avec ces paramètres défauts, thermique est légèrement moins cher : écart = -510
    expect(state.values.get(302)).toBeCloseTo(-510, 1);
  });

  it("gros rouleur (25 000 km/an, 10 ans) → électrique gagne", () => {
    const state = evalWith({
      km: 25000,
      duree: 10,
      prixVE: 35000,
      prixTH: 25000,
      consoVE: 16,
      consoTH: 6.5,
      rfrCat: "1",
      pkwh: 0.2,
      pessence: 1.9,
    });
    expect(state.stable).toBe(true);

    const tcoVE = state.values.get(300) as number;
    const tcoTH = state.values.get(301) as number;
    const ecart = state.values.get(302) as number;

    // Coût énergie VE annuel : 25000/100 * 16 * 0.20 = 800
    // Coût carburant TH annuel : 25000/100 * 6.5 * 1.90 = 3087.5
    // Sur 10 ans : 8000 vs 30875
    // TCO VE = 31000 + 8000 = 39000
    // TCO TH = 25000 + 30875 = 55875
    expect(tcoVE).toBeCloseTo(39000, 1);
    expect(tcoTH).toBeCloseTo(55875, 1);
    expect(ecart).toBeCloseTo(16875, 1);
    expect(ecart).toBeGreaterThan(0); // VE gagne
  });

  it("RFR cat 0 (bas) → bonus maximum 7 000", () => {
    const state = evalWith({
      km: 12000,
      duree: 5,
      prixVE: 35000,
      prixTH: 25000,
      consoVE: 16,
      consoTH: 6.5,
      rfrCat: "0",
      pkwh: 0.2,
      pessence: 1.9,
    });
    expect(state.values.get(100)).toBe(7000);
    expect(state.values.get(200)).toBe(28000); // 35 - 7
  });

  it("RFR cat 3 (haut) → pas de bonus", () => {
    const state = evalWith({
      km: 12000,
      duree: 5,
      prixVE: 35000,
      prixTH: 25000,
      consoVE: 16,
      consoTH: 6.5,
      rfrCat: "3",
      pkwh: 0.2,
      pessence: 1.9,
    });
    expect(state.values.get(100)).toBe(0);
    expect(state.values.get(200)).toBe(35000);
  });

  it("monte en charge sur prixVE → écart diminue", () => {
    const baseInput = {
      km: 20000,
      duree: 7,
      prixTH: 25000,
      consoVE: 16,
      consoTH: 6.5,
      rfrCat: "1",
      pkwh: 0.2,
      pessence: 1.9,
    };
    const e1 = evalWith({ ...baseInput, prixVE: 30000 });
    const e2 = evalWith({ ...baseInput, prixVE: 40000 });
    const ecart1 = e1.values.get(302) as number;
    const ecart2 = e2.values.get(302) as number;
    expect(ecart1 - ecart2).toBeCloseTo(10000, 1); // exactement la diff de prix
  });

  it("économie annuelle = écart / durée", () => {
    const state = evalWith({
      km: 25000,
      duree: 10,
      prixVE: 35000,
      prixTH: 25000,
      consoVE: 16,
      consoTH: 6.5,
      rfrCat: "1",
      pkwh: 0.2,
      pessence: 1.9,
    });
    const ecart = state.values.get(302) as number;
    const ecartAnnuel = state.values.get(303) as number;
    expect(ecartAnnuel * 10).toBeCloseTo(ecart, 1);
  });

  it("converge en peu d'itérations (chaîne de calcul de 6 niveaux)", () => {
    const state = evalWith({
      km: 12000,
      duree: 5,
      prixVE: 35000,
      prixTH: 25000,
      consoVE: 16,
      consoTH: 6.5,
      rfrCat: "1",
      pkwh: 0.2,
      pessence: 1.9,
    });
    expect(state.iterations).toBeLessThanOrEqual(8);
  });
});
