import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Simulator, toJsonSchema, SCHEMA_VERSION } from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const examplesDir = resolve(__dirname, "..", "examples");

function loadExample(name: string): unknown {
  const path = resolve(examplesDir, `${name}.json`);
  return JSON.parse(readFileSync(path, "utf-8")) as unknown;
}

describe("Simulator schema — exemples du corpus", () => {
  it("parse frais-locataire.json sans erreur", () => {
    const data = loadExample("frais-locataire");
    const result = Simulator.safeParse(data);
    if (!result.success) {
      // Affichage explicite pour debug
      console.error(JSON.stringify(result.error.format(), null, 2));
    }
    expect(result.success).toBe(true);
  });

  it("parse taxeLogementsVacants.json sans erreur", () => {
    const data = loadExample("taxeLogementsVacants");
    const result = Simulator.safeParse(data);
    if (!result.success) {
      console.error(JSON.stringify(result.error.format(), null, 2));
    }
    expect(result.success).toBe(true);
  });

  it("le schemaVersion vaut bien la constante exportée", () => {
    expect(SCHEMA_VERSION).toBe(1);
    const parsed = Simulator.parse(loadExample("frais-locataire"));
    expect(parsed.schemaVersion).toBe(SCHEMA_VERSION);
  });
});

describe("Simulator schema — invariants", () => {
  it("rejette une donnée id dupliquée", () => {
    const data = loadExample("frais-locataire") as { data: Array<{ id: number }> };
    if (data.data[0]) data.data[0].id = 2; // collision avec id 2 existante
    const result = Simulator.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejette un opérateur unaire avec une value", () => {
    const data = loadExample("frais-locataire") as {
      rules: Array<{ conditions: unknown }>;
    };
    // R1 a deux conditions `present`. On force `value: "x"` sur la première.
    const rule0 = data.rules[0]!;
    type CondExpr = { kind: "connector"; children: Array<{ kind: "condition"; value?: string }> };
    (rule0.conditions as CondExpr).children[0]!.value = "should-not-be-here";
    const result = Simulator.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejette une référence vers une donnée inexistante", () => {
    const data = loadExample("frais-locataire") as {
      rules: Array<{ conditions: unknown }>;
    };
    type CondExpr = {
      kind: "connector";
      children: Array<{ kind: "condition"; operand?: number }>;
    };
    (data.rules[0]!.conditions as CondExpr).children[0]!.operand = 9999;
    const result = Simulator.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("exige au moins une étape", () => {
    const data = loadExample("frais-locataire") as { steps: unknown[] };
    data.steps = [];
    const result = Simulator.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe("Simulator schema — JSON Schema", () => {
  it("génère un JSON Schema avec un titre", () => {
    const jsonSchema = toJsonSchema();
    expect(jsonSchema).toBeTypeOf("object");
    expect(JSON.stringify(jsonSchema)).toContain("Simulator");
  });
});
