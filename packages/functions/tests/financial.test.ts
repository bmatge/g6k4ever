import { describe, it, expect } from "vitest";
import { createStandardRegistry } from "../src/index.js";

describe("Fonctions financières", () => {
  const reg = createStandardRegistry();

  describe("pv (valeur actuelle d'une annuité)", () => {
    it("rate=0 → payment × periods", () => {
      expect(reg.call("pv", [0, 60, 100])).toBe(6000);
    });

    it("calcul standard PV", () => {
      // 100 € / mois pendant 60 mois à 0.5% / mois (~6% / an)
      // PV = 100 * (1 - 1.005^-60) / 0.005 = 100 * 51.7256 ≈ 5172.56
      const pv = reg.call("pv", [0.005, 60, 100]) as number;
      expect(pv).toBeCloseTo(5172.56, 1);
    });

    it("PV cohérent avec PMT (inverse)", () => {
      const pv = reg.call("pv", [0.005, 60, 100]) as number;
      const pmt = reg.call("pmt", [0.005, 60, pv]) as number;
      expect(pmt).toBeCloseTo(100, 5);
    });

    it("PV monotone : plus de périodes → PV plus grande", () => {
      const pv1 = reg.call("pv", [0.005, 12, 100]) as number;
      const pv2 = reg.call("pv", [0.005, 60, 100]) as number;
      expect(pv2).toBeGreaterThan(pv1);
    });
  });

  describe("pmt (paiement d'une annuité)", () => {
    it("rate=0 → pv / periods", () => {
      expect(reg.call("pmt", [0, 60, 6000])).toBe(100);
    });

    it("emprunt 20 000 € à 4% sur 60 mois ≈ 368 €/mois", () => {
      const monthlyRate = 0.04 / 12;
      const pmt = reg.call("pmt", [monthlyRate, 60, 20000]) as number;
      expect(pmt).toBeCloseTo(368.33, 1);
    });
  });

  describe("select", () => {
    it("matche une clé exacte", () => {
      expect(reg.call("select", [1, 0, "a", 1, "b", 2, "c"])).toBe("b");
    });

    it("retourne le default si nombre impair de pairs", () => {
      expect(reg.call("select", [99, 0, "a", 1, "b", "default"])).toBe("default");
    });

    it("retourne undefined si pas de match et pas de default", () => {
      expect(reg.call("select", [99, 0, "a", 1, "b"])).toBeUndefined();
    });

    it("tolère les types mixtes string/number", () => {
      expect(reg.call("select", ["1", 0, "a", 1, "b"])).toBe("b");
      expect(reg.call("select", [1, "0", "a", "1", "b"])).toBe("b");
    });

    it("voiture : zone tendue → tarif", () => {
      // select(zone, 0, 8, 1, 10, 2, 12)
      expect(reg.call("select", [0, 0, 8, 1, 10, 2, 12])).toBe(8);
      expect(reg.call("select", [1, 0, 8, 1, 10, 2, 12])).toBe(10);
      expect(reg.call("select", [2, 0, 8, 1, 10, 2, 12])).toBe(12);
    });
  });

  describe("Maths complémentaires", () => {
    it("ceil arrondit vers le haut", () => {
      expect(reg.call("ceil", [3.2])).toBe(4);
      expect(reg.call("ceil", [-1.5])).toBe(-1);
    });

    it("round arrondit standard", () => {
      expect(reg.call("round", [3.4])).toBe(3);
      expect(reg.call("round", [3.5])).toBe(4);
    });

    it("abs valeur absolue", () => {
      expect(reg.call("abs", [-5])).toBe(5);
      expect(reg.call("abs", [5])).toBe(5);
    });

    it("pow exponentielle", () => {
      expect(reg.call("pow", [2, 10])).toBe(1024);
      expect(reg.call("pow", [1.005, 60])).toBeCloseTo(1.3489, 3);
    });
  });
});
