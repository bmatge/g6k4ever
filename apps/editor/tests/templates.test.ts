import { describe, it, expect } from "vitest";
import { Simulator } from "@g6k4ever/schema";
import { createBlankSimulator } from "../src/index.js";

describe("createBlankSimulator", () => {
  it("produit un simulateur valide (safeParse OK)", () => {
    const sim = createBlankSimulator("ma-creation", "Ma création");
    const result = Simulator.safeParse(sim);
    if (!result.success) {
      console.error(JSON.stringify(result.error.format(), null, 2));
    }
    expect(result.success).toBe(true);
  });

  it("utilise le slug et le label fournis", () => {
    const sim = createBlankSimulator("test-slug", "Test Label");
    expect(sim.metadata.name).toBe("test-slug");
    expect(sim.metadata.label).toBe("Test Label");
  });

  it("a une étape avec un champ pour démarrer", () => {
    const sim = createBlankSimulator("x", "X");
    expect(sim.steps).toHaveLength(1);
    expect(sim.data).toHaveLength(1);
    expect(sim.steps[0]!.blocks[0]!.type).toBe("field");
  });
});
