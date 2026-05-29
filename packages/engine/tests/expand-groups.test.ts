import { describe, it, expect } from "vitest";
import { Simulator as SimulatorSchema, type Simulator } from "@g6k4ever/schema";
import { evaluate, expandGroups, interpolateI } from "../src/index.js";
import { InMemoryDataSource } from "../src/resolvers.js";
import { createTestRegistry } from "./test-helpers.js";

describe("interpolateI", () => {
  it("remplace {i} par l'index", () => {
    expect(interpolateI("prix{i}", 5)).toBe("prix5");
    expect(interpolateI("forfait{i} du mois {i}", 3)).toBe("forfait3 du mois 3");
  });

  it("supporte {i+N}, {i-N}, {i*N}", () => {
    expect(interpolateI("#{i+100}", 5)).toBe("#105");
    expect(interpolateI("#{i-1}", 5)).toBe("#4");
    expect(interpolateI("#{i*10}", 3)).toBe("#30");
  });
});

describe("expandGroups — 0 itération si pas de groupes", () => {
  it("no-op sur un simulateur sans groups", () => {
    const sim: Simulator = makeMinimalSimulator();
    const expanded = expandGroups(sim);
    expect(expanded.data).toEqual(sim.data);
    expect(expanded.groups).toEqual([]);
  });
});

describe("expandGroups — N itérations", () => {
  it("génère N Data depuis un template", () => {
    const sim = makeMinimalSimulator();
    sim.groups = [
      {
        id: "mois",
        label: "Mois",
        iterations: 3,
        startIndex: 1,
        dataIdBase: 100,
        dataIdStride: 10,
        dataTemplates: [
          { idOffset: 0, name: "prix{i}", label: "Prix {i}", type: "money" },
          { idOffset: 1, name: "qte{i}", label: "Qté {i}", type: "integer" },
        ],
      },
    ];
    const expanded = expandGroups(sim);
    // 3 itérations × 2 templates = 6 nouvelles Data
    expect(expanded.data).toHaveLength(sim.data.length + 6);
    // i=1: id 100 prix1, id 101 qte1
    const prix1 = expanded.data.find((d) => d.id === 100);
    const qte1 = expanded.data.find((d) => d.id === 101);
    expect(prix1).toMatchObject({ name: "prix1", label: "Prix 1", type: "money" });
    expect(qte1).toMatchObject({ name: "qte1", label: "Qté 1", type: "integer" });
    // i=3: id 120 prix3
    const prix3 = expanded.data.find((d) => d.id === 120);
    expect(prix3).toMatchObject({ name: "prix3", label: "Prix 3" });
  });

  it("interpole {i} dans content (expression)", () => {
    const sim = makeMinimalSimulator();
    sim.groups = [
      {
        id: "ventes",
        label: "Ventes",
        iterations: 2,
        startIndex: 1,
        dataIdBase: 100,
        dataIdStride: 10,
        dataTemplates: [
          { idOffset: 0, name: "prix{i}", label: "Prix {i}", type: "money" },
          { idOffset: 1, name: "qte{i}", label: "Qté {i}", type: "integer" },
          { idOffset: 2, name: "total{i}", label: "Total {i}", type: "money", content: "#{i+99} * #{i+100}" },
        ],
      },
    ];
    const expanded = expandGroups(sim);
    const total1 = expanded.data.find((d) => d.id === 102);
    const total2 = expanded.data.find((d) => d.id === 112);
    // i=1 : {i+99}=100 (prix1), {i+100}=101 (qte1)
    expect(total1?.content).toBe("#100 * #101");
    // i=2 : {i+99}=101 mais ATTENTION, l'interpolation est numérique : i=2 → {i+99}=101 (= prix1+10... oups en fait pour le i=2 on veut prix2 (id 110) et qte2 (id 111))
    // → le template doit utiliser des ratios stables, pas des offsets liés à i.
    // C'est pourquoi en pratique on écrit content avec idOffsets explicites :
    // ex. "#{i*10+90} * #{i*10+91}" pour i=1 → 100*101 ; i=2 → 110*111
    expect(total2?.content).toBe("#101 * #102"); // ce n'est pas ce qu'on voulait mais c'est cohérent
  });

  it("interpole avec multiplication pour stride : {i*10+90}", () => {
    const sim = makeMinimalSimulator();
    sim.groups = [
      {
        id: "ventes",
        label: "Ventes",
        iterations: 2,
        startIndex: 1,
        dataIdBase: 100,
        dataIdStride: 10,
        dataTemplates: [
          { idOffset: 0, name: "prix{i}", label: "Prix {i}", type: "money" },
          { idOffset: 1, name: "qte{i}", label: "Qté {i}", type: "integer" },
          { idOffset: 2, name: "total{i}", label: "Total {i}", type: "money", content: "#{i*10+90} * #{i*10+91}" },
        ],
      },
    ];
    const expanded = expandGroups(sim);
    const total1 = expanded.data.find((d) => d.id === 102);
    const total2 = expanded.data.find((d) => d.id === 112);
    expect(total1?.content).toBe("#100 * #101"); // prix1 × qte1
    expect(total2?.content).toBe("#110 * #111"); // prix2 × qte2
  });

  it("collision d'id → erreur", () => {
    const sim = makeMinimalSimulator();
    sim.data.push({ id: 100, name: "deja", label: "Déjà existante", type: "text" });
    sim.groups = [
      {
        id: "g",
        label: "G",
        iterations: 1,
        startIndex: 1,
        dataIdBase: 100,
        dataIdStride: 10,
        dataTemplates: [{ idOffset: 0, name: "x{i}", label: "X{i}", type: "text" }],
      },
    ];
    expect(() => expandGroups(sim)).toThrow(/déjà utilisé/);
  });

  it("dataIdStride <= max(idOffset) → erreur", () => {
    const sim = makeMinimalSimulator();
    sim.groups = [
      {
        id: "g",
        label: "G",
        iterations: 2,
        startIndex: 1,
        dataIdBase: 100,
        dataIdStride: 1, // trop petit
        dataTemplates: [
          { idOffset: 0, name: "a{i}", label: "A{i}", type: "text" },
          { idOffset: 1, name: "b{i}", label: "B{i}", type: "text" },
        ],
      },
    ];
    expect(() => expandGroups(sim)).toThrow(/dataIdStride/);
  });
});

describe("expand-groups → engine end-to-end", () => {
  it("évalue les Data générées par expansion", () => {
    const raw = {
      schemaVersion: 1,
      metadata: { name: "test-groups", label: "Test", authors: [] },
      outputKind: "calcul",
      data: [],
      sources: [],
      steps: [{ id: 1, name: "s", label: "S", blocks: [] }],
      rules: [],
      footnotes: [],
      groups: [
        {
          id: "trimestre",
          label: "Trimestre",
          iterations: 4,
          startIndex: 1,
          dataIdBase: 100,
          dataIdStride: 10,
          dataTemplates: [
            { idOffset: 0, name: "ventes{i}", label: "Ventes T{i}", type: "money" },
            {
              idOffset: 1,
              name: "majore{i}",
              label: "Ventes majorées T{i}",
              type: "money",
              content: "#{i*10+90} * 1.2",
            },
          ],
        },
      ],
    };
    const parsed = SimulatorSchema.safeParse(raw);
    if (!parsed.success) {
      console.error(JSON.stringify(parsed.error.format(), null, 2));
      throw new Error("Simulator avec groups invalide");
    }
    const sim = parsed.data;

    const datasources = new InMemoryDataSource();
    const functions = createTestRegistry();
    const state = evaluate(
      sim,
      { ventes1: 1000, ventes2: 1500, ventes3: 2000, ventes4: 2500 },
      { resolvers: { datasources }, functions, maxIterations: 10 },
    );
    expect(state.stable).toBe(true);
    // majoré T1 = 1000 × 1.2 = 1200
    expect(state.values.get(101)).toBeCloseTo(1200, 1);
    // majoré T4 = 2500 × 1.2 = 3000
    expect(state.values.get(131)).toBeCloseTo(3000, 1);
  });
});

function makeMinimalSimulator(): Simulator {
  return {
    schemaVersion: 1,
    metadata: {
      name: "test",
      label: "Test",
      defaultLocale: "fr-FR",
      dateFormat: "dd/MM/yyyy",
      authors: [],
    },
    outputKind: "calcul",
    data: [],
    sources: [],
    steps: [{ id: 1, name: "s", label: "S", blocks: [] }],
    rules: [],
    footnotes: [],
    groups: [],
  };
}
