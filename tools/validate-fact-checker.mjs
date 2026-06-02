import { Simulator } from "../packages/schema/dist/simulator.js";
import raw from "../_corpus/portail-elec/fact-checker.json" with { type: "json" };

const r = Simulator.safeParse(raw);
if (!r.success) {
  console.error("INVALID");
  console.error(JSON.stringify(r.error.format(), null, 2));
  process.exit(1);
}
console.log("OK fact-checker.json parses against schema");
console.log("- steps:", r.data.steps.length);
console.log("- rules:", r.data.rules.length);
console.log("- data:", r.data.data.length);
