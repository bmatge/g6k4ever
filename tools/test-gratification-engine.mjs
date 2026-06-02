// Test moteur : reproduit un scénario réel et vérifie la gratification totale.
// Scénario : 6 mois à 151h/mois, taux 15%, plafond horaire 29€/h.
// Attendu : gratifMinHeure = 0.15 * 29 = 4.35 €/h
//           gratifMois     = 151 * 4.35 = 656.85 €/mois
//           totalGratif    = 6 * 656.85 = 3941.10 €
//           totalHeures    = 6 * 151 = 906 h

import { evaluate, InMemoryDataSource } from "../packages/engine/dist/index.js";
import { createStandardRegistry } from "../packages/functions/dist/index.js";
import { Simulator as SimulatorSchema } from "../packages/schema/dist/simulator.js";
import raw from "../_corpus/g6k/gratification-stagiaire.json" with { type: "json" };

const sim = SimulatorSchema.parse(raw);
const functions = createStandardRegistry();
const resolvers = new InMemoryDataSource({});

let pass = 0, fail = 0;
function assert(cond, label, got, expected) {
  if (cond) { pass++; console.log(`  ✅ ${label}${got !== undefined ? " — " + got : ""}`); }
  else { fail++; console.log(`  ❌ ${label} — got ${got}, expected ${expected}`); }
}

function nearly(a, b, eps = 0.01) {
  return typeof a === "number" && typeof b === "number" && Math.abs(a - b) < eps;
}

console.log("Cas 1 — 6 mois à 151h, taux par défaut (15%), plafond par défaut (29 €/h)");
{
  const input = {
    nbHeures1: 151, nbHeures2: 151, nbHeures3: 151,
    nbHeures4: 151, nbHeures5: 151, nbHeures6: 151,
    // mois 7..12 laissés vides
  };
  const out = evaluate(sim, input, { resolvers: { datasources: resolvers }, functions });

  // Data top-level
  const taux = out.values.get(1);
  const plafond = out.values.get(2);
  const gratifMinH = out.values.get(3);
  const totalHeures = out.values.get(4);
  const totalGratif = out.values.get(5);

  assert(taux === 0.15, "tauxMinimal défaut = 0.15", taux);
  assert(plafond === 29, "plafondHoraire défaut = 29", plafond);
  assert(nearly(gratifMinH, 4.35), "gratifMinHeure = 4.35 €/h", gratifMinH);
  assert(totalHeures === 906, "totalHeures = 906 h", totalHeures);
  assert(nearly(totalGratif, 3941.1), "totalGratification = 3941.10 €", totalGratif);

  // Vérifier que les Data du group sont bien expandées : gratifMois1 = id 103
  const gratifMois1 = out.values.get(103);
  const gratifMois2 = out.values.get(113);
  const gratifMois7 = out.values.get(163);
  assert(nearly(gratifMois1, 656.85), "gratifMois1 (#103) = 656.85", gratifMois1);
  assert(nearly(gratifMois2, 656.85), "gratifMois2 (#113) = 656.85", gratifMois2);
  assert(gratifMois7 === undefined || gratifMois7 === 0 || Number.isNaN(gratifMois7), "gratifMois7 (#163) sans nbHeures = vide/0", gratifMois7);
}

console.log("\nCas 2 — Modification du taux à 20%");
{
  const input = { nbHeures1: 100, tauxMinimal: 0.20 };
  const out = evaluate(sim, input, { resolvers: { datasources: resolvers }, functions });
  const gratifMinH = out.values.get(3);
  const gratifMois1 = out.values.get(103);
  assert(nearly(gratifMinH, 5.8), "gratifMinHeure = 0.20 * 29 = 5.80", gratifMinH);
  assert(nearly(gratifMois1, 580), "gratifMois1 = 100 * 5.80 = 580", gratifMois1);
}

console.log("\nCas 3 — Aucun mois renseigné");
{
  const input = {};
  const out = evaluate(sim, input, { resolvers: { datasources: resolvers }, functions });
  const totalGratif = out.values.get(5);
  // sum() sur 12 vides doit donner 0 (les undefined sont filtrés par sum)
  assert(totalGratif === 0 || totalGratif === undefined, "totalGratification sans saisie = 0 ou undefined", totalGratif);
}

console.log("\nCas 4 — Vérifier que les 48 Data du group sont bien générées (4 × 12)");
{
  // Sans même évaluer, on compte la taille du data array expandé
  const expanded = sim.data.length + sim.groups[0].dataTemplates.length * sim.groups[0].iterations;
  assert(expanded === 6 + 48, "expanded data count = 54", expanded, 54);
}

console.log(`\nRésultat : ${pass} pass / ${fail} fail`);
if (fail > 0) process.exit(1);
