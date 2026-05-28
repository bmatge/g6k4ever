import type { BlockDefinition } from "./types.js";
import { BlockValidationError } from "./types.js";

/**
 * Registre des blocs disponibles. Les blocs sont enregistrés une fois (typiquement
 * à l'init de l'app — runtime ou éditeur) et lookupés par `type`.
 */
export class BlockRegistry {
  private readonly defs = new Map<string, BlockDefinition<unknown>>();

  /**
   * Enregistre une définition de bloc. La dernière inscription gagne (utile en
   * test pour stubber un bloc).
   */
  register<TConfig>(def: BlockDefinition<TConfig>): this {
    this.defs.set(def.type, def as BlockDefinition<unknown>);
    return this;
  }

  /**
   * Récupère une définition par type. Retourne `undefined` si non enregistré.
   */
  get(type: string): BlockDefinition<unknown> | undefined {
    return this.defs.get(type);
  }

  /** A un type donné. */
  has(type: string): boolean {
    return this.defs.has(type);
  }

  /** Itère sur toutes les définitions enregistrées. */
  list(): BlockDefinition<unknown>[] {
    return Array.from(this.defs.values());
  }

  /**
   * Valide la `config` d'un bloc instance contre le schéma du type enregistré.
   *
   * Lance `BlockValidationError` si :
   *   - le type n'est pas enregistré
   *   - la config ne respecte pas le schéma Zod
   */
  validate(type: string, config: unknown): void {
    const def = this.defs.get(type);
    if (!def) {
      throw new BlockValidationError(type, "type non enregistré");
    }
    const result = def.configSchema.safeParse(config);
    if (!result.success) {
      throw new BlockValidationError(type, JSON.stringify(result.error.format(), null, 2));
    }
  }
}
