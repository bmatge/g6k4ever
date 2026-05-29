import { lt } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { locks } from "../db/schema.js";

/**
 * Démarre un job qui supprime périodiquement les verrous expirés.
 *
 * Sans ce job, les verrous expirés restent en DB jusqu'à ce qu'un autre user
 * tente de les acquérir (cleanup paresseux). Avec lui, on garantit que la
 * table `locks` ne grossit pas indéfiniment et que les requêtes restent rapides.
 *
 * Retourne une fonction `stop` à appeler au shutdown.
 */
export function startLockPurgeJob(
  db: Db,
  options: {
    /** Intervalle entre deux passes en ms. Défaut : 5 min. */
    intervalMs?: number;
    /** Logger optionnel (par défaut console.log). */
    log?: (msg: string) => void;
    /** Fonction d'horloge — pratique pour les tests. */
    now?: () => number;
  } = {},
): () => void {
  const intervalMs = options.intervalMs ?? 5 * 60 * 1000;
  const log = options.log ?? (() => undefined);
  const nowFn = options.now ?? (() => Date.now());

  const purge = (): number => {
    const now = nowFn();
    const result = db.delete(locks).where(lt(locks.expiresAt, now)).run();
    if (result.changes > 0) {
      log(`[lock-purge] purgé ${result.changes} verrou(s) expiré(s)`);
    }
    return result.changes;
  };

  // Première passe immédiate au démarrage.
  purge();
  const handle = setInterval(purge, intervalMs);

  return () => clearInterval(handle);
}
