/**
 * Helpers de test internes — évitent une dépendance package vers @g6k4ever/functions
 * (qui dépend lui-même de @g6k4ever/engine et créerait une boucle dans Turbo).
 *
 * Ces helpers réimplémentent un mini-registre de fonctions standard suffisant pour
 * les golden tests. La VRAIE implémentation publique vit dans `@g6k4ever/functions`.
 */

import type { FunctionRegistry } from "../src/index.js";

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

const parseDateInternal = (v: unknown): Date => {
  if (v instanceof Date) return v;
  if (typeof v === "string") {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (typeof v === "number") return new Date(v);
  throw new Error(`Impossible de parser la valeur en Date: ${String(v)}`);
};

/**
 * Mini-registre exposant les fonctions standard + un point d'extension `register()`
 * pour les fonctions métier dans les tests.
 */
export class TestRegistry implements FunctionRegistry {
  private readonly fns: Map<string, (args: unknown[]) => unknown>;

  constructor() {
    this.fns = new Map<string, (args: unknown[]) => unknown>([
      ["sum", (args) => args.reduce<number>((a, v) => a + N(v), 0)],
      [
        "floor",
        (args) => {
          if (args.length !== 1) throw new Error("floor() attend 1 argument");
          return Math.floor(N(args[0]));
        },
      ],
      [
        "max",
        (args) => {
          if (args.length === 0) throw new Error("max() attend au moins 1 argument");
          let m = N(args[0]);
          for (let i = 1; i < args.length; i++) {
            const n = N(args[i]);
            if (n > m) m = n;
          }
          return m;
        },
      ],
      [
        "min",
        (args) => {
          if (args.length === 0) throw new Error("min() attend au moins 1 argument");
          let m = N(args[0]);
          for (let i = 1; i < args.length; i++) {
            const n = N(args[i]);
            if (n < m) m = n;
          }
          return m;
        },
      ],
      ["count", (args) => args.filter(isDef).length],
      [
        "year",
        (args) => {
          if (args.length !== 1) throw new Error("year() attend 1 argument");
          return parseDateInternal(args[0]).getUTCFullYear();
        },
      ],
      [
        "date",
        (args) => {
          if (args.length !== 1) throw new Error("date() attend 1 argument");
          return parseDateInternal(args[0]);
        },
      ],
      [
        "strftime",
        (args) => {
          if (args.length !== 2) throw new Error("strftime() attend (date, format)");
          const d = parseDateInternal(args[0]);
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
        },
      ],
    ]);
  }

  register(name: string, impl: (args: unknown[]) => unknown): this {
    this.fns.set(name, impl);
    return this;
  }

  has(name: string): boolean {
    return this.fns.has(name);
  }

  call(name: string, args: unknown[]): unknown {
    const fn = this.fns.get(name);
    if (!fn) throw new Error(`Fonction non enregistrée: ${name}`);
    return fn(args);
  }
}

export const createTestRegistry = (): TestRegistry => new TestRegistry();
