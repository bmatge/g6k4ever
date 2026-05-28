import { eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { locks, simulators, type LockRow } from "../db/schema.js";

/**
 * TTL par défaut d'un verrou (15 minutes). Configurable à la construction.
 */
export const DEFAULT_LOCK_TTL_MS = 15 * 60 * 1000;

export type LockOutcome =
  | { status: "acquired"; lock: LockRow }
  | { status: "held-by-other"; heldBy: string; expiresAt: number }
  | { status: "not-found" };

export type ReleaseOutcome =
  | { status: "released" }
  | { status: "held-by-other"; heldBy: string }
  | { status: "not-locked" }
  | { status: "not-found" };

export interface LockServiceOptions {
  ttlMs?: number;
  /** Fonction d'horloge — pratique pour les tests. */
  now?: () => number;
}

/**
 * Service de verrouillage d'édition.
 *
 * - Lock pessimiste, un seul détenteur à la fois.
 * - TTL côté serveur (15 min par défaut), le client peut prolonger via heartbeat.
 * - `force=true` permet de prendre le verrou même s'il appartient à un autre user
 *   (admin / take-over manuel).
 * - Les verrous expirés sont considérés comme libres (cleanup paresseux à
 *   l'acquisition ; un job de purge peut tourner en arrière-plan si besoin).
 */
export class LockService {
  private readonly ttl: number;
  private readonly nowFn: () => number;

  constructor(
    private readonly db: Db,
    options: LockServiceOptions = {},
  ) {
    this.ttl = options.ttlMs ?? DEFAULT_LOCK_TTL_MS;
    this.nowFn = options.now ?? (() => Date.now());
  }

  acquire(slug: string, userId: string, force = false): LockOutcome {
    const sim = this.db.select().from(simulators).where(eq(simulators.slug, slug)).get();
    if (!sim) return { status: "not-found" };

    const now = this.nowFn();
    const expiresAt = now + this.ttl;
    const existing = this.db.select().from(locks).where(eq(locks.simulatorId, sim.id)).get();

    if (existing && existing.expiresAt > now && existing.userId !== userId && !force) {
      return { status: "held-by-other", heldBy: existing.userId, expiresAt: existing.expiresAt };
    }

    // Acquire (insert ou refresh).
    const upserted = this.db
      .insert(locks)
      .values({ simulatorId: sim.id, userId, acquiredAt: now, expiresAt })
      .onConflictDoUpdate({
        target: locks.simulatorId,
        set: { userId, acquiredAt: now, expiresAt },
      })
      .returning()
      .get();
    return { status: "acquired", lock: upserted };
  }

  /** Renouvelle le TTL si l'appelant est bien le détenteur. */
  heartbeat(slug: string, userId: string): LockOutcome {
    const sim = this.db.select().from(simulators).where(eq(simulators.slug, slug)).get();
    if (!sim) return { status: "not-found" };

    const now = this.nowFn();
    const existing = this.db.select().from(locks).where(eq(locks.simulatorId, sim.id)).get();
    if (!existing || existing.expiresAt <= now) {
      // Verrou inexistant ou expiré — on l'acquiert.
      return this.acquire(slug, userId);
    }
    if (existing.userId !== userId) {
      return { status: "held-by-other", heldBy: existing.userId, expiresAt: existing.expiresAt };
    }
    const expiresAt = now + this.ttl;
    const updated = this.db
      .update(locks)
      .set({ expiresAt })
      .where(eq(locks.simulatorId, sim.id))
      .returning()
      .get();
    return { status: "acquired", lock: updated };
  }

  release(slug: string, userId: string, force = false): ReleaseOutcome {
    const sim = this.db.select().from(simulators).where(eq(simulators.slug, slug)).get();
    if (!sim) return { status: "not-found" };

    const existing = this.db.select().from(locks).where(eq(locks.simulatorId, sim.id)).get();
    if (!existing) return { status: "not-locked" };

    if (existing.userId !== userId && !force) {
      return { status: "held-by-other", heldBy: existing.userId };
    }

    this.db.delete(locks).where(eq(locks.simulatorId, sim.id)).run();
    return { status: "released" };
  }

  /**
   * Vérifie qu'un user a le droit d'écrire sur ce simulateur (= détient le lock,
   * ou pas de lock du tout). Utilisé par les routes mutables.
   */
  canWrite(slug: string, userId: string): { allowed: boolean; reason?: string; heldBy?: string } {
    const sim = this.db.select().from(simulators).where(eq(simulators.slug, slug)).get();
    if (!sim) return { allowed: false, reason: "not-found" };

    const existing = this.db.select().from(locks).where(eq(locks.simulatorId, sim.id)).get();
    if (!existing) return { allowed: true };
    if (existing.expiresAt <= this.nowFn()) return { allowed: true };
    if (existing.userId === userId) return { allowed: true };
    return { allowed: false, reason: "held-by-other", heldBy: existing.userId };
  }
}
