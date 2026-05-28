import { FunctionRegistryImpl } from "./registry.js";

/**
 * Fonctions standard du moteur, identifiées dans le corpus G6K et étendues
 * pour couvrir le corpus portail-elec (cf. docs/analysis/decisions.md).
 *
 * - `defined(x)` est primitive — gérée directement par l'évaluateur d'expressions
 *   (évite les soucis d'évaluation paresseuse). PAS ici.
 * - `sum(...args)` — somme variadique. Ignore les undefined/null.
 * - `floor(x)` — entier inférieur ou égal.
 * - `max(...args)` / `min(...args)` — extrémum variadique.
 * - `count(...args)` — nombre d'arguments non vides.
 * - `year(date)` — millésime d'une date (Date ou string ISO).
 * - `strftime(date, format)` — formatage simple (sous-ensemble strftime).
 * - `date(iso)` — parse une chaîne ISO en Date (cf. D2 — pas de littéral date dans la grammaire).
 */
const N = (v: unknown): number => {
  if (v === undefined || v === null || v === "") return 0;
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  }
  return Number(v);
};

const isDef = (v: unknown): boolean => v !== undefined && v !== null && v !== "";

const sum = (args: unknown[]): number => args.reduce<number>((acc, v) => acc + N(v), 0);

const floor = (args: unknown[]): number => {
  if (args.length !== 1) throw new Error("floor() attend 1 argument");
  return Math.floor(N(args[0]));
};

const max = (args: unknown[]): number => {
  if (args.length === 0) throw new Error("max() attend au moins 1 argument");
  let m = N(args[0]);
  for (let i = 1; i < args.length; i++) {
    const n = N(args[i]);
    if (n > m) m = n;
  }
  return m;
};

const min = (args: unknown[]): number => {
  if (args.length === 0) throw new Error("min() attend au moins 1 argument");
  let m = N(args[0]);
  for (let i = 1; i < args.length; i++) {
    const n = N(args[i]);
    if (n < m) m = n;
  }
  return m;
};

const count = (args: unknown[]): number => args.filter(isDef).length;

const parseDate = (v: unknown): Date => {
  if (v instanceof Date) return v;
  if (typeof v === "string") {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (typeof v === "number") return new Date(v);
  throw new Error(`Impossible de parser la valeur en Date: ${String(v)}`);
};

const yearFn = (args: unknown[]): number => {
  if (args.length !== 1) throw new Error("year() attend 1 argument");
  return parseDate(args[0]).getUTCFullYear();
};

const dateFn = (args: unknown[]): Date => {
  if (args.length !== 1) throw new Error("date() attend 1 argument");
  return parseDate(args[0]);
};

/**
 * Mini-implémentation de strftime (sous-ensemble) :
 *   %Y → année 4 chiffres
 *   %m → mois 01-12
 *   %d → jour 01-31
 *   %H → heure 00-23
 *   %M → minute 00-59
 *   %S → seconde 00-59
 *   %% → caractère %
 */
const strftime = (args: unknown[]): string => {
  if (args.length !== 2) throw new Error("strftime() attend (date, format)");
  const d = parseDate(args[0]);
  const fmt = String(args[1]);
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return fmt.replace(/%[YmdHMS%]/g, (m) => {
    switch (m) {
      case "%Y":
        return String(d.getUTCFullYear());
      case "%m":
        return pad(d.getUTCMonth() + 1);
      case "%d":
        return pad(d.getUTCDate());
      case "%H":
        return pad(d.getUTCHours());
      case "%M":
        return pad(d.getUTCMinutes());
      case "%S":
        return pad(d.getUTCSeconds());
      case "%%":
        return "%";
      default:
        return m;
    }
  });
};

/**
 * Crée un registre pré-rempli avec les fonctions standard.
 *
 * `defined` n'est PAS dans le registre : le moteur la traite comme primitive
 * (cf. expression/evaluator.ts).
 */
export function createStandardRegistry(): FunctionRegistryImpl {
  return new FunctionRegistryImpl([
    ["sum", sum],
    ["floor", floor],
    ["max", max],
    ["min", min],
    ["count", count],
    ["year", yearFn],
    ["date", dateFn],
    ["strftime", strftime],
  ]);
}
