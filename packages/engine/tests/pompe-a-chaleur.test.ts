import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Simulator as SimulatorSchema, type Simulator } from "@g6k4ever/schema";
import { evaluate, InMemoryDataSource } from "../src/index.js";
import { createTestRegistry } from "./test-helpers.js";

/**
 * Test d'acceptation portail-elec : pompe-a-chaleur.
 *
 * Vérifie que le simulateur calcule correctement :
 *   - besoinUtile via lookup multi-dimensionnel (zone × isolation)
 *   - factureActuelle = besoinUtile × prix énergie actuelle
 *   - factureFuturePac = (besoinUtile / COP) × prix élec
 *   - économie annuelle, coût net, amortissement
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const corpusPath = resolve(__dirname, "..", "..", "..", "_corpus", "portail-elec", "pompe-a-chaleur.json");

let simulator: Simulator;
const functions = createTestRegistry();

const datasources = new InMemoryDataSource();
datasources.register(
  "coef-besoin",
  [
    { zone: "H1", iso: "bon", coef: 80 },
    { zone: "H1", iso: "moyen", coef: 140 },
    { zone: "H1", iso: "mauvais", coef: 220 },
    { zone: "H2", iso: "bon", coef: 65 },
    { zone: "H2", iso: "moyen", coef: 120 },
    { zone: "H2", iso: "mauvais", coef: 190 },
    { zone: "H3", iso: "bon", coef: 50 },
    { zone: "H3", iso: "moyen", coef: 95 },
    { zone: "H3", iso: "mauvais", coef: 160 },
  ],
  (row, params) => row.zone === params.zone && row.iso === params.iso,
);
datasources.register(
  "prix-energie",
  [
    { energie: "fioul", prix: 0.155 },
    { energie: "gaz", prix: 0.115 },
    { energie: "propane", prix: 0.18 },
    { energie: "elec", prix: 0.2 },
  ],
  (row, params) => row.energie === params.energie,
);
datasources.register(
  "mpr",
  [
    { cat: "tres-modeste", montant: 9000 },
    { cat: "modeste", montant: 7000 },
    { cat: "intermediaire", montant: 4000 },
    { cat: "superieur", montant: 0 },
  ],
  (row, params) => row.cat === params.cat,
);

beforeAll(() => {
  const raw = JSON.parse(readFileSync(corpusPath, "utf-8")) as unknown;
  const parsed = SimulatorSchema.safeParse(raw);
  if (!parsed.success) {
    console.error(JSON.stringify(parsed.error.format(), null, 2));
    throw new Error("pompe-a-chaleur.json invalide");
  }
  simulator = parsed.data;
});

const evalWith = (input: Record<string, unknown>) =>
  evaluate(simulator, input, {
    resolvers: { datasources },
    functions,
    maxIterations: 20,
  });

describe("pompe-a-chaleur — scénarios canoniques", () => {
  it("la définition charge sans erreur", () => {
    expect(simulator).toBeDefined();
    expect(simulator.metadata.name).toBe("pompe-a-chaleur");
  });

  it("100m² H2 isolation moyenne gaz → besoin = 12000 kWh, facture ≈ 1380 €", () => {
    const state = evalWith({
      surface: 100,
      zone: "H2",
      isolation: "moyen",
      energieActuelle: "gaz",
      rfrCat: "intermediaire",
      prixElec: 0.2,
      copPac: 3.5,
      primeCEE: 4000,
    });
    expect(state.stable).toBe(true);
    // coefBesoin H2 moyen = 120 kWh/m²/an
    expect(state.values.get(100)).toBe(120);
    // prixEnergie gaz = 0.115
    expect(state.values.get(101)).toBe(0.115);
    // besoinUtile = 100 × 120 = 12 000
    expect(state.values.get(200)).toBe(12000);
    // factureActuelle = 12000 × 0.115 = 1380
    expect(state.values.get(201)).toBeCloseTo(1380, 1);
  });

  it("conso PAC + facture future + économie annuelle", () => {
    const state = evalWith({
      surface: 100,
      zone: "H2",
      isolation: "moyen",
      energieActuelle: "gaz",
      rfrCat: "intermediaire",
      prixElec: 0.2,
      copPac: 3.5,
      primeCEE: 4000,
    });
    // consoPac = 12000 / 3.5 ≈ 3428.57
    expect(state.values.get(202)).toBeCloseTo(3428.57, 1);
    // facturePac = 3428.57 × 0.2 ≈ 685.71
    expect(state.values.get(203)).toBeCloseTo(685.71, 1);
    // économie = 1380 - 685.71 ≈ 694.29
    expect(state.values.get(204)).toBeCloseTo(694.29, 1);
  });

  it("coût brut 25 000 € (100m² × 250) → coût net = 17 000 € après MPR Violet + CEE", () => {
    const state = evalWith({
      surface: 100,
      zone: "H2",
      isolation: "moyen",
      energieActuelle: "gaz",
      rfrCat: "intermediaire",
      prixElec: 0.2,
      copPac: 3.5,
      primeCEE: 4000,
    });
    // coutInstallation = 100 × 250 = 25000
    expect(state.values.get(300)).toBe(25000);
    // primeRenov intermediaire = 4000
    expect(state.values.get(104)).toBe(4000);
    // aidesTotales = 4000 + 4000 = 8000
    expect(state.values.get(301)).toBe(8000);
    // coutNet = 25000 - 8000 = 17000
    expect(state.values.get(302)).toBe(17000);
  });

  it("amortissement = coutNet / economieAnnuelle (≈ 24.5 ans dans ce cas)", () => {
    const state = evalWith({
      surface: 100,
      zone: "H2",
      isolation: "moyen",
      energieActuelle: "gaz",
      rfrCat: "intermediaire",
      prixElec: 0.2,
      copPac: 3.5,
      primeCEE: 4000,
    });
    const coutNet = state.values.get(302) as number;
    const economie = state.values.get(204) as number;
    const amort = state.values.get(303) as number;
    expect(amort).toBeCloseTo(coutNet / economie, 1);
    expect(amort).toBeCloseTo(24.49, 1);
  });

  it("très modeste (MaPrimeRénov' max 9000) → amortissement plus court", () => {
    const intermediaire = evalWith({
      surface: 100,
      zone: "H2",
      isolation: "moyen",
      energieActuelle: "fioul",
      rfrCat: "intermediaire",
      prixElec: 0.2,
      copPac: 3.5,
      primeCEE: 4000,
    });
    const tresModeste = evalWith({
      surface: 100,
      zone: "H2",
      isolation: "moyen",
      energieActuelle: "fioul",
      rfrCat: "tres-modeste",
      prixElec: 0.2,
      copPac: 3.5,
      primeCEE: 4000,
    });
    expect(tresModeste.values.get(302)).toBeLessThan(intermediaire.values.get(302) as number);
    expect(tresModeste.values.get(303)).toBeLessThan(intermediaire.values.get(303) as number);
  });

  it("mauvaise isolation → besoin plus grand → plus d'économie absolue avec PAC", () => {
    const bon = evalWith({
      surface: 100,
      zone: "H2",
      isolation: "bon",
      energieActuelle: "gaz",
      rfrCat: "intermediaire",
      prixElec: 0.2,
      copPac: 3.5,
      primeCEE: 4000,
    });
    const mauvais = evalWith({
      surface: 100,
      zone: "H2",
      isolation: "mauvais",
      energieActuelle: "gaz",
      rfrCat: "intermediaire",
      prixElec: 0.2,
      copPac: 3.5,
      primeCEE: 4000,
    });
    expect(mauvais.values.get(204)).toBeGreaterThan(bon.values.get(204) as number);
  });

  it("zone H1 (froid) demande plus que H3 (doux)", () => {
    const h1 = evalWith({
      surface: 100,
      zone: "H1",
      isolation: "moyen",
      energieActuelle: "gaz",
      rfrCat: "intermediaire",
      prixElec: 0.2,
      copPac: 3.5,
      primeCEE: 4000,
    });
    const h3 = evalWith({
      surface: 100,
      zone: "H3",
      isolation: "moyen",
      energieActuelle: "gaz",
      rfrCat: "intermediaire",
      prixElec: 0.2,
      copPac: 3.5,
      primeCEE: 4000,
    });
    expect(h1.values.get(200)).toBe(14000); // 100 × 140
    expect(h3.values.get(200)).toBe(9500); // 100 × 95
    expect(h1.values.get(204)).toBeGreaterThan(h3.values.get(204) as number);
  });
});
