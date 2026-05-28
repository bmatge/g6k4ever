import { describe, it, expect } from "vitest";
import {
  BlockRegistry,
  BlockValidationError,
  createStandardRegistry,
  textSectionBlock,
  fieldBlock,
  kpiCardBlock,
} from "../src/index.js";

describe("BlockRegistry", () => {
  it("register / has / get", () => {
    const reg = new BlockRegistry();
    reg.register(textSectionBlock);
    expect(reg.has("text-section")).toBe(true);
    expect(reg.has("unknown")).toBe(false);
    expect(reg.get("text-section")).toBeDefined();
    expect(reg.get("unknown")).toBeUndefined();
  });

  it("list énumère les blocs", () => {
    const reg = createStandardRegistry();
    const types = reg.list().map((b) => b.type);
    expect(types).toEqual(expect.arrayContaining(["text-section", "field", "kpi-card"]));
  });

  it("validate accepte une config valide", () => {
    const reg = createStandardRegistry();
    expect(() =>
      reg.validate("text-section", { content: "Hello #1", variant: "info" }),
    ).not.toThrow();
  });

  it("validate refuse un type inconnu", () => {
    const reg = createStandardRegistry();
    expect(() => reg.validate("nope", {})).toThrowError(BlockValidationError);
  });

  it("validate refuse une config invalide (champ requis manquant)", () => {
    const reg = createStandardRegistry();
    expect(() => reg.validate("text-section", { variant: "info" })).toThrowError(
      BlockValidationError,
    );
  });
});

describe("textSectionBlock", () => {
  it("configSchema accepte les variants DSFR", () => {
    expect(textSectionBlock.configSchema.safeParse({ content: "x" }).success).toBe(true);
    expect(textSectionBlock.configSchema.safeParse({ content: "x", variant: "warning" }).success).toBe(
      true,
    );
    expect(textSectionBlock.configSchema.safeParse({ content: "x", variant: "wat" }).success).toBe(false);
  });

  it("readsDataIds extrait les #id du contenu", () => {
    const ids = textSectionBlock.readsDataIds({
      content: "La commune de #3 est en zone #2",
      variant: "default",
    });
    expect(ids.sort()).toEqual([2, 3]);
  });

  it("readsDataIds retourne [] pour un texte sans variables", () => {
    expect(
      textSectionBlock.readsDataIds({ content: "Pas de variables", variant: "default" }),
    ).toEqual([]);
  });

  it("writesDataIds est toujours vide (lecture seule)", () => {
    expect(textSectionBlock.writesDataIds({ content: "x", variant: "default" })).toEqual([]);
  });
});

describe("fieldBlock", () => {
  it("configSchema valide les 11 types de Data", () => {
    const baseTypes = [
      "integer",
      "number",
      "money",
      "percent",
      "boolean",
      "choice",
      "text",
      "textarea",
      "date",
      "month",
      "year",
    ] as const;
    for (const dataType of baseTypes) {
      const result = fieldBlock.configSchema.safeParse({
        dataId: 1,
        dataName: "x",
        dataType,
        label: "L",
      });
      expect(result.success, `dataType=${dataType}`).toBe(true);
    }
  });

  it("readsDataIds et writesDataIds retournent l'id du champ", () => {
    const config = {
      dataId: 42,
      dataName: "x",
      dataType: "text" as const,
      label: "L",
      required: false,
    };
    expect(fieldBlock.readsDataIds(config)).toEqual([42]);
    expect(fieldBlock.writesDataIds(config)).toEqual([42]);
  });
});

describe("kpiCardBlock", () => {
  it("configSchema valide les 4 formats", () => {
    const formats = ["raw", "money", "percent", "integer"] as const;
    for (const format of formats) {
      const result = kpiCardBlock.configSchema.safeParse({ label: "L", dataId: 1, format });
      expect(result.success, `format=${format}`).toBe(true);
    }
  });

  it("readsDataIds = [dataId] ; writesDataIds = []", () => {
    const config = {
      label: "Total",
      dataId: 7,
      format: "money" as const,
      currencySymbol: "€",
      variant: "default" as const,
    };
    expect(kpiCardBlock.readsDataIds(config)).toEqual([7]);
    expect(kpiCardBlock.writesDataIds(config)).toEqual([]);
  });

  it("editorMeta a un label et un groupe", () => {
    expect(kpiCardBlock.editorMeta.label).toBeTruthy();
    expect(kpiCardBlock.editorMeta.group).toBeTruthy();
    expect(kpiCardBlock.editorMeta.icon).toMatch(/^fr-icon-/);
  });
});
