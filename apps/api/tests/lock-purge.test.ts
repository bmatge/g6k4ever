import { describe, it, expect, vi } from "vitest";
import { createDb, runMigrations, startLockPurgeJob, SimulatorService, LockService } from "../src/index.js";

describe("startLockPurgeJob", () => {
  it("purge les verrous dont expiresAt est passé", async () => {
    const { db, raw } = createDb({ url: ":memory:", enableWal: false });
    runMigrations(raw);
    const sim = new SimulatorService(db);
    const created = sim.create(
      {
        schemaVersion: 1,
        metadata: { name: "t1", label: "T1", defaultLocale: "fr-FR", dateFormat: "dd/MM/yyyy", authors: [] },
        outputKind: "decision",
        data: [],
        sources: [],
        steps: [{ id: 1, name: "s", label: "S", blocks: [] }],
        rules: [],
        footnotes: [],
      },
      "alice",
    );
    expect(created.slug).toBe("t1");

    // Lock avec TTL très court (1 ms) pour pouvoir le tester comme expiré.
    let fakeNow = Date.now();
    const lockService = new LockService(db, { ttlMs: 1, now: () => fakeNow });
    lockService.acquire("t1", "alice");

    // Avance le temps de +10ms : le verrou est expiré.
    fakeNow += 10;

    let purgedCount = 0;
    const stop = startLockPurgeJob(db, {
      intervalMs: 60_000,
      now: () => fakeNow,
      log: (m) => {
        purgedCount = Number(m.match(/(\d+) verrou/)?.[1] ?? 0);
      },
    });
    // La purge initiale s'exécute synchrone au démarrage.
    expect(purgedCount).toBe(1);
    stop();
    raw.close();
  });

  it("ne purge pas un verrou encore valide", () => {
    const { db, raw } = createDb({ url: ":memory:", enableWal: false });
    runMigrations(raw);
    const sim = new SimulatorService(db);
    sim.create(
      {
        schemaVersion: 1,
        metadata: { name: "t2", label: "T2", defaultLocale: "fr-FR", dateFormat: "dd/MM/yyyy", authors: [] },
        outputKind: "decision",
        data: [],
        sources: [],
        steps: [{ id: 1, name: "s", label: "S", blocks: [] }],
        rules: [],
        footnotes: [],
      },
      "alice",
    );
    const lockService = new LockService(db);
    lockService.acquire("t2", "alice");

    let purgedCount = 0;
    const stop = startLockPurgeJob(db, {
      intervalMs: 60_000,
      log: (m) => {
        purgedCount = Number(m.match(/(\d+) verrou/)?.[1] ?? 0);
      },
    });
    expect(purgedCount).toBe(0);
    stop();
    raw.close();
  });
});
