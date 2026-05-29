import { Simulator } from "../packages/schema/dist/simulator.js";
import raw from "../_corpus/g6k/gratification-stagiaire.json" with { type: "json" };
const r = Simulator.safeParse(raw);
if (!r.success) {
  console.error("INVALID");
  console.error(JSON.stringify(r.error.format(), null, 2));
  process.exit(1);
}
console.log("OK gratification-stagiaire.json parses against schema");
console.log("- steps:", r.data.steps.length);
console.log("- data top-level:", r.data.data.length);
console.log("- groups:", r.data.groups.length);
