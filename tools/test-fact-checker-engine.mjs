// Test moteur fact-checker : vérifie que sélectionner famille+sujet active le bon chapter via les règles
import { evaluate } from "../packages/engine/dist/index.js";
import { InMemoryDataSource } from "../packages/engine/dist/index.js";
import { createStandardRegistry } from "../packages/functions/dist/index.js";
import { Simulator as SimulatorSchema } from "../packages/schema/dist/simulator.js";
import raw from "../_corpus/portail-elec/fact-checker.json" with { type: "json" };

const sim = SimulatorSchema.parse(raw);
const functions = createStandardRegistry();
const resolvers = new InMemoryDataSource({});

function visKey(state, idSuffix) {
  for (const [key, val] of state.visibility) {
    if (key.endsWith(`:${idSuffix}`)) return val;
  }
  return undefined; // undefined = no rule fired
}

function run(input) {
  return evaluate(sim, input, { resolvers, functions });
}

let pass = 0;
let fail = 0;
function assert(cond, label) {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label}`); }
}

console.log("Cas 1 — aucune entrée");
{
  const out = run({});
  assert(visKey(out, "chap-sujet-wrapper") === false, "chap-sujet-wrapper hidden");
  assert(visKey(out, "2") === false, "step 2 hidden");
}

console.log("\nCas 2 — famille=environment");
{
  const out = run({ famille: "environment" });
  assert(visKey(out, "chap-sujet-wrapper") === true, "chap-sujet-wrapper visible");
  assert(visKey(out, "2") === false, "step 2 still hidden (sujet not selected)");
}

console.log("\nCas 3 — sujet=environment.carbon_footprint");
{
  const out = run({
    famille: "environment",
    sujet: "environment.carbon_footprint",
  });
  assert(visKey(out, "2") === true, "step 2 visible");
  assert(visKey(out, "chap-sujet-environment-carbon_footprint") === true, "carbon_footprint chapter visible");
  assert(visKey(out, "chap-sujet-financial-resale") === false, "resale chapter hidden");
  assert(visKey(out, "chap-sujet-environment-lithium_mining") === false, "lithium chapter hidden");
}

console.log("\nCas 4 — sujet=financial.purchase_price (autre famille que l'écosystème)");
{
  const out = run({
    famille: "financial",
    sujet: "financial.purchase_price",
  });
  assert(visKey(out, "chap-sujet-financial-purchase_price") === true, "purchase_price chapter visible");
  assert(visKey(out, "chap-sujet-environment-carbon_footprint") === false, "carbon_footprint chapter hidden");
}

console.log(`\nRésultat : ${pass} pass / ${fail} fail`);
if (fail > 0) process.exit(1);
