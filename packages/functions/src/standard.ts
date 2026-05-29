import { FunctionRegistryImpl } from "./registry.js";

/**
 * Fonctions standard du moteur, identifiées dans le corpus G6K et étendues
 * pour couvrir le corpus portail-elec (cf. docs/analysis/decisions.md).
 *
 * - `defined(x)` est primitive — gérée directement par l'évaluateur d'expressions.
 * - `sum(...args)` — somme variadique. Ignore les undefined/null.
 * - `floor(x)` — entier inférieur ou égal.
 * - `ceil(x)` — entier supérieur ou égal.
 * - `round(x)` — arrondi standard.
 * - `abs(x)` — valeur absolue.
 * - `max(...args)` / `min(...args)` — extrémum variadique.
 * - `count(...args)` — nombre d'arguments non vides.
 * - `year(date)` — millésime d'une date.
 * - `strftime(date, format)` — formatage simple.
 * - `date(iso)` — parse une chaîne ISO en Date.
 * - `pow(base, exp)` — exponentielle.
 *
 * **Fonctions financières** (corpus portail-elec — changer-de-classe, voiture) :
 * - `pv(rate, periods, payment)` — valeur actuelle d'une annuité (PV).
 * - `pmt(rate, periods, presentValue)` — paiement périodique d'une annuité.
 *
 * **Fonctions de tableau** (corpus portail-elec — paliers, lookups) :
 * - `select(value, ...pairs)` — switch sur valeur : `select(x, k1,v1, k2,v2, default)`.
 *   ex. `select(zone, 0, 8, 1, 10, 2, 12)` → 8 si zone=0, 10 si zone=1, etc.
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

const ceil = (args: unknown[]): number => {
  if (args.length !== 1) throw new Error("ceil() attend 1 argument");
  return Math.ceil(N(args[0]));
};

const round = (args: unknown[]): number => {
  if (args.length !== 1) throw new Error("round() attend 1 argument");
  return Math.round(N(args[0]));
};

const abs = (args: unknown[]): number => {
  if (args.length !== 1) throw new Error("abs() attend 1 argument");
  return Math.abs(N(args[0]));
};

const pow = (args: unknown[]): number => {
  if (args.length !== 2) throw new Error("pow() attend (base, exposant)");
  return Math.pow(N(args[0]), N(args[1]));
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
 * Valeur actuelle d'une annuité ordinaire.
 *
 *   PV = payment × (1 - (1 + rate)^-periods) / rate
 *
 * - rate : taux par période (ex. 0.04 / 12 pour 4% annuel avec mensualités)
 * - periods : nombre de périodes
 * - payment : paiement périodique (économie pour changer-de-classe)
 *
 * Si rate = 0, retourne `payment × periods`.
 */
const pv = (args: unknown[]): number => {
  if (args.length !== 3) throw new Error("pv() attend (rate, periods, payment)");
  const rate = N(args[0]);
  const periods = N(args[1]);
  const payment = N(args[2]);
  if (rate === 0) return payment * periods;
  return (payment * (1 - Math.pow(1 + rate, -periods))) / rate;
};

/**
 * Paiement périodique d'une annuité ordinaire.
 *
 *   PMT = pv × rate / (1 - (1 + rate)^-periods)
 *
 * Si rate = 0, retourne `pv / periods`.
 */
const pmt = (args: unknown[]): number => {
  if (args.length !== 3) throw new Error("pmt() attend (rate, periods, presentValue)");
  const rate = N(args[0]);
  const periods = N(args[1]);
  const presentValue = N(args[2]);
  if (rate === 0) return presentValue / periods;
  return (presentValue * rate) / (1 - Math.pow(1 + rate, -periods));
};

/**
 * Sélecteur switch-like : `select(value, k1, v1, k2, v2, …, default)`.
 *
 * Compare `value` à chaque clé `kI` ; retourne `vI` au premier match.
 * Si aucun match et un nombre IMPAIR d'arguments après value, le dernier est
 * traité comme valeur par défaut.
 *
 * ex. `select(zone, 0, 8, 1, 10, 2, 12, 0)` :
 *   - zone=0 → 8
 *   - zone=1 → 10
 *   - zone=2 → 12
 *   - autre  → 0 (default)
 */
const select = (args: unknown[]): unknown => {
  if (args.length < 3) throw new Error("select() attend au moins (value, key1, val1)");
  const value = args[0];
  const rest = args.slice(1);
  for (let i = 0; i + 1 < rest.length; i += 2) {
    if (looseEqual(value, rest[i])) return rest[i + 1];
  }
  // Default si nombre impair de pairs après value.
  if (rest.length % 2 === 1) return rest[rest.length - 1];
  return undefined;
};

function looseEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a === "number" && typeof b === "string") return a === Number(b);
  if (typeof a === "string" && typeof b === "number") return Number(a) === b;
  return String(a) === String(b);
}

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
    ["ceil", ceil],
    ["round", round],
    ["abs", abs],
    ["pow", pow],
    ["max", max],
    ["min", min],
    ["count", count],
    ["year", yearFn],
    ["date", dateFn],
    ["strftime", strftime],
    ["pv", pv],
    ["pmt", pmt],
    ["select", select],
  ]);
}
