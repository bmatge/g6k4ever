import type { Simulator, Data } from "@g6k4ever/schema";

/**
 * Expand les `groups` d'un simulateur en Data concrètes ajoutées au tableau
 * `data`. Le simulateur original n'est pas modifié.
 *
 * Pour chaque `RepeatableGroup`, génère N copies de chaque `DataTemplate` avec :
 *   - id = `dataIdBase + (i × dataIdStride) + tmpl.idOffset` (où i est 0-indexed
 *     dans la boucle interne ; l'index affiché est `startIndex + i`)
 *   - name / label / content : chaîne avec `{i}` remplacé par l'index affiché
 *
 * Lance une `Error` si :
 *   - Un id généré entre en collision avec une Data existante.
 *   - Un id généré entre en collision avec une autre Data du même groupe.
 *   - Le `dataIdStride` est inférieur au plus grand `idOffset` + 1.
 */
export function expandGroups(simulator: Simulator): Simulator {
  if (!simulator.groups || simulator.groups.length === 0) return simulator;

  const allDataIds = new Set<number>(simulator.data.map((d) => d.id));
  const newData: Data[] = [];

  for (const group of simulator.groups) {
    const maxOffset = Math.max(...group.dataTemplates.map((t) => t.idOffset));
    if (group.dataIdStride <= maxOffset) {
      throw new Error(
        `RepeatableGroup "${group.id}" : dataIdStride (${group.dataIdStride}) doit être > max(idOffset)=${maxOffset}.`,
      );
    }

    for (let i = 0; i < group.iterations; i++) {
      const displayedIndex = group.startIndex + i;
      const baseForIteration = group.dataIdBase + i * group.dataIdStride;
      for (const tmpl of group.dataTemplates) {
        const id = baseForIteration + tmpl.idOffset;
        if (allDataIds.has(id)) {
          throw new Error(
            `RepeatableGroup "${group.id}" itération ${displayedIndex} : id=${id} déjà utilisé.`,
          );
        }
        allDataIds.add(id);
        const data: Data = {
          id,
          name: interpolateI(tmpl.name, displayedIndex),
          label: interpolateI(tmpl.label, displayedIndex),
          type: tmpl.type,
          ...(tmpl.content ? { content: interpolateI(tmpl.content, displayedIndex) } : {}),
          ...(tmpl.default ? { default: interpolateI(tmpl.default, displayedIndex) } : {}),
          ...(tmpl.min ? { min: interpolateI(tmpl.min, displayedIndex) } : {}),
          ...(tmpl.max ? { max: interpolateI(tmpl.max, displayedIndex) } : {}),
          ...(tmpl.unit ? { unit: tmpl.unit } : {}),
        };
        newData.push(data);
      }
    }
  }

  return {
    ...simulator,
    data: [...simulator.data, ...newData],
    groups: [], // marqué comme expandé
  };
}

/**
 * Remplace `{i}` par la valeur d'index dans une chaîne.
 *
 * Pour `{i+N}` (ex. `{i+200}`), évalue l'arithmétique simple : remplacement
 * par `index + N`. Idem `{i-N}`, `{i*N}`.
 */
export function interpolateI(template: string, index: number): string {
  return template.replace(/\{i([^}]*)\}/g, (_match, ops: string) => {
    if (!ops) return String(index);
    try {
      return String(evalSimpleArith(index, ops));
    } catch {
      return _match;
    }
  });
}

/**
 * Mini-évaluateur arithmétique : prend `index` + une suite de `(op)(number)`
 * (ex. `*10+90`, `+200`, `-1`) et retourne le résultat numérique. Respecte
 * la priorité multiplication/division sur addition/soustraction (2 passes).
 */
function evalSimpleArith(index: number, ops: string): number {
  const tokens: Array<{ op: "+" | "-" | "*" | "/"; n: number }> = [];
  let i = 0;
  while (i < ops.length) {
    const op = ops[i];
    if (op !== "+" && op !== "-" && op !== "*" && op !== "/") throw new Error("op invalide");
    i++;
    const start = i;
    while (i < ops.length && !"+-*/".includes(ops[i]!)) i++;
    const n = Number(ops.slice(start, i));
    if (Number.isNaN(n)) throw new Error("nombre invalide");
    tokens.push({ op, n });
  }
  // Priorité * /  (associativité gauche)
  const reduced: Array<{ op: "+" | "-"; n: number }> = [{ op: "+", n: index }];
  for (const t of tokens) {
    if (t.op === "*") {
      reduced[reduced.length - 1]!.n *= t.n;
    } else if (t.op === "/") {
      reduced[reduced.length - 1]!.n /= t.n;
    } else {
      reduced.push({ op: t.op, n: t.n });
    }
  }
  return reduced.reduce((acc, t) => (t.op === "+" ? acc + t.n : acc - t.n), 0);
}
