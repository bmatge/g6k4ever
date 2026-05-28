import { describe, it, expect } from "vitest";
import { createStandardRegistry, FunctionRegistryImpl } from "../src/index.js";

describe("createStandardRegistry — fonctions standard", () => {
  const reg = createStandardRegistry();

  it("sum() additionne et tolère les valeurs vides", () => {
    expect(reg.call("sum", [1, 2, 3])).toBe(6);
    expect(reg.call("sum", [1, undefined, 2, null, 3])).toBe(6);
    expect(reg.call("sum", [])).toBe(0);
  });

  it("floor() retourne l'entier inférieur", () => {
    expect(reg.call("floor", [3.7])).toBe(3);
    expect(reg.call("floor", [-1.5])).toBe(-2);
    expect(() => reg.call("floor", [])).toThrow();
  });

  it("max() / min() variadique", () => {
    expect(reg.call("max", [3, 7, 1])).toBe(7);
    expect(reg.call("min", [3, 7, 1])).toBe(1);
  });

  it("count() compte les valeurs définies", () => {
    expect(reg.call("count", [1, undefined, 3, null, "", "x"])).toBe(3);
  });

  it("year() extrait l'année d'une date ISO", () => {
    expect(reg.call("year", ["2024-06-15"])).toBe(2024);
  });

  it("date() parse une chaîne ISO", () => {
    const d = reg.call("date", ["2024-06-15"]) as Date;
    expect(d).toBeInstanceOf(Date);
    expect(d.getUTCFullYear()).toBe(2024);
  });

  it("strftime() formate selon %Y-%m-%d", () => {
    expect(reg.call("strftime", ["2024-06-15", "%Y-%m-%d"])).toBe("2024-06-15");
    expect(reg.call("strftime", ["2024-06-15", "%d/%m/%Y"])).toBe("15/06/2024");
  });

  it("has() reconnaît les fonctions standard", () => {
    expect(reg.has("sum")).toBe(true);
    expect(reg.has("year")).toBe(true);
    expect(reg.has("unknown")).toBe(false);
  });
});

describe("FunctionRegistryImpl — extensibilité métier", () => {
  it("permet d'enregistrer des fonctions métier", () => {
    const reg = new FunctionRegistryImpl();
    reg.register("getInsee", (args) => (args[0] === "Paris" ? "75056" : null));
    expect(reg.call("getInsee", ["Paris"])).toBe("75056");
    expect(reg.call("getInsee", ["Inconnu"])).toBeNull();
  });

  it("écrase une fonction existante (utile en test)", () => {
    const reg = createStandardRegistry();
    reg.register("sum", () => 42);
    expect(reg.call("sum", [1, 2, 3])).toBe(42);
  });

  it("call() lève si la fonction est inconnue", () => {
    const reg = new FunctionRegistryImpl();
    expect(() => reg.call("missing", [])).toThrow(/non enregistrée/);
  });
});
