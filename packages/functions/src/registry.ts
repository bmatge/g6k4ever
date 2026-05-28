import type { FunctionRegistry } from "@g6k4ever/engine";

/**
 * Implémentation par défaut d'un `FunctionRegistry`.
 *
 * Les fonctions sont enregistrées via `register()` ou fournies au constructeur.
 * Les noms doivent être uniques ; la dernière inscription gagne (utile pour
 * remplacer une fonction métier en test).
 */
export class FunctionRegistryImpl implements FunctionRegistry {
  private readonly fns = new Map<string, (args: unknown[]) => unknown>();

  constructor(entries?: Iterable<readonly [string, (args: unknown[]) => unknown]>) {
    if (entries) {
      for (const [name, fn] of entries) this.fns.set(name, fn);
    }
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
