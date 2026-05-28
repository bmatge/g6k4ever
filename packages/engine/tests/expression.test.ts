import { describe, it, expect } from "vitest";
import {
  parseExpression,
  preprocessExpression,
  evaluateAst,
  isDefined,
  truthy,
  compareEquality,
  type EvalContext,
} from "../src/index.js";
import { createTestRegistry, TestRegistry } from "./test-helpers.js";

const ctx = (values: Record<number, unknown>, functions = createTestRegistry()): EvalContext => ({
  values: new Map(Object.entries(values).map(([k, v]) => [Number(k), v])),
  functions,
  source: "<test>",
});

const evalExpr = (src: string, values: Record<number, unknown> = {}, functions = createTestRegistry()) =>
  evaluateAst(parseExpression(src), ctx(values, functions));

describe("preprocessExpression", () => {
  it("remplace #id par __data_id", () => {
    expect(preprocessExpression("#42 + 1")).toBe("__data_42 + 1");
    expect(preprocessExpression("#1 == #2")).toBe("__data_1 == __data_2");
    expect(preprocessExpression("defined(#3)")).toBe("defined(__data_3)");
  });

  it("ne touche pas aux nombres standalone", () => {
    expect(preprocessExpression("3 + 4")).toBe("3 + 4");
  });
});

describe("evaluateAst — littéraux et identifiants", () => {
  it("évalue les littéraux", () => {
    expect(evalExpr("42")).toBe(42);
    expect(evalExpr("3.14")).toBe(3.14);
    expect(evalExpr("'hello'")).toBe("hello");
    expect(evalExpr("true")).toBe(true);
    expect(evalExpr("false")).toBe(false);
  });

  it("résout les références #id", () => {
    expect(evalExpr("#5", { 5: 42 })).toBe(42);
    expect(evalExpr("#5", { 5: "abc" })).toBe("abc");
    expect(evalExpr("#5", {})).toBeUndefined();
  });
});

describe("evaluateAst — arithmétique", () => {
  it("addition / soustraction / multiplication / division", () => {
    expect(evalExpr("2 + 3")).toBe(5);
    expect(evalExpr("10 - 4")).toBe(6);
    expect(evalExpr("3 * 4")).toBe(12);
    expect(evalExpr("12 / 4")).toBe(3);
    expect(evalExpr("7 % 3")).toBe(1);
  });

  it("priorité standard", () => {
    expect(evalExpr("2 + 3 * 4")).toBe(14);
    expect(evalExpr("(2 + 3) * 4")).toBe(20);
  });

  it("coerce undefined en 0 pour les calculs", () => {
    expect(evalExpr("#1 + 5", {})).toBe(5);
    expect(evalExpr("#1 * 3", { 1: 4 })).toBe(12);
  });

  it("concatène les chaînes via +", () => {
    expect(evalExpr("'hello ' + 'world'")).toBe("hello world");
    expect(evalExpr("#1 + #2", { 1: "abc", 2: "def" })).toBe("abcdef");
  });

  it("division par zéro lève EvaluationError", () => {
    expect(() => evalExpr("10 / 0")).toThrow(/division par zéro/);
  });
});

describe("evaluateAst — comparaisons", () => {
  it("opérateurs ==, !=, <, <=, >, >=", () => {
    expect(evalExpr("5 == 5")).toBe(true);
    expect(evalExpr("5 == 6")).toBe(false);
    expect(evalExpr("5 != 6")).toBe(true);
    expect(evalExpr("3 < 5")).toBe(true);
    expect(evalExpr("5 < 3")).toBe(false);
    expect(evalExpr("5 <= 5")).toBe(true);
    expect(evalExpr("5 > 3")).toBe(true);
    expect(evalExpr("5 >= 5")).toBe(true);
  });

  it("coercion numérique tolérante", () => {
    expect(compareEquality(5, "5")).toBe(true);
    expect(compareEquality("0", 0)).toBe(true);
    expect(evalExpr("#1 == 1", { 1: "1" })).toBe(true);
  });
});

describe("evaluateAst — logique && / || / !", () => {
  it("court-circuit && et ||", () => {
    expect(evalExpr("true && 5")).toBe(5);
    expect(evalExpr("false && 5")).toBe(false);
    expect(evalExpr("0 || 'default'")).toBe("default");
    expect(evalExpr("'value' || 'default'")).toBe("value");
  });

  it("négation !", () => {
    expect(evalExpr("!true")).toBe(false);
    expect(evalExpr("!false")).toBe(true);
    expect(evalExpr("!#1", { 1: undefined })).toBe(true);
  });
});

describe("evaluateAst — fonctions", () => {
  it("defined() primitive", () => {
    expect(evalExpr("defined(#1)", { 1: 5 })).toBe(true);
    expect(evalExpr("defined(#1)", {})).toBe(false);
    expect(evalExpr("defined(#1)", { 1: "" })).toBe(false);
    expect(evalExpr("defined(#1)", { 1: null })).toBe(false);
  });

  it("fonctions standard via registre", () => {
    expect(evalExpr("sum(1, 2, 3)")).toBe(6);
    expect(evalExpr("floor(3.7)")).toBe(3);
    expect(evalExpr("max(1, 5, 3)")).toBe(5);
    expect(evalExpr("min(1, 5, 3)")).toBe(1);
    expect(evalExpr("count(1, 2, undefined)", { 1: 1 })).toBe(2);
  });

  it("year() sur date ISO", () => {
    expect(evalExpr("year(date('2024-06-15'))")).toBe(2024);
  });

  it("strftime() basique", () => {
    expect(evalExpr("strftime(date('2024-06-15'), '%Y-%m-%d')")).toBe("2024-06-15");
  });

  it("fonction inconnue lève EvaluationError", () => {
    expect(() => evalExpr("unknownFn(1)")).toThrow(/fonction inconnue/);
  });

  it("fonction métier injectée", () => {
    const reg = new TestRegistry();
    reg.register("getInsee", (args) => (args[0] === "Paris" ? "75056" : null));
    expect(evalExpr("getInsee('Paris')", {}, reg)).toBe("75056");
    expect(evalExpr("getInsee('Inconnue')", {}, reg)).toBeNull();
  });
});

describe("isDefined / truthy", () => {
  it("isDefined : valeur présente ET non vide", () => {
    expect(isDefined(0)).toBe(true);
    expect(isDefined(false)).toBe(true);
    expect(isDefined("")).toBe(false);
    expect(isDefined(undefined)).toBe(false);
    expect(isDefined(null)).toBe(false);
  });

  it("truthy : sémantique de l'engine", () => {
    expect(truthy(0)).toBe(false);
    expect(truthy("")).toBe(false);
    expect(truthy(null)).toBe(false);
    expect(truthy(undefined)).toBe(false);
    expect(truthy(false)).toBe(false);
    expect(truthy(1)).toBe(true);
    expect(truthy("a")).toBe(true);
    expect(truthy(true)).toBe(true);
  });
});
