import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDb, runMigrations, SimulatorService, seedCorpus } from "../src/index.js";

function makeTempDir(): string {
  const dir = join(tmpdir(), `g6k4ever-seed-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

const minimalSim = (slug: string) => ({
  schemaVersion: 1,
  metadata: { name: slug, label: `Demo ${slug}`, defaultLocale: "fr-FR", dateFormat: "dd/MM/yyyy", authors: [] },
  outputKind: "calcul",
  data: [],
  sources: [],
  steps: [{ id: 1, name: "s", label: "S", blocks: [] }],
  rules: [],
  footnotes: [],
});

describe("seedCorpus", () => {
  it("crée les simulateurs depuis un dossier", () => {
    const { db, raw } = createDb({ url: ":memory:", enableWal: false });
    runMigrations(raw);
    const service = new SimulatorService(db);

    const dir = makeTempDir();
    writeFileSync(join(dir, "a.json"), JSON.stringify(minimalSim("sim-a")));
    writeFileSync(join(dir, "b.json"), JSON.stringify(minimalSim("sim-b")));

    const result = seedCorpus(service, { directories: [dir] });
    expect(result.created.sort()).toEqual(["sim-a", "sim-b"]);
    expect(result.skipped).toEqual([]);
    expect(result.errors).toEqual([]);

    expect(service.list()).toHaveLength(2);

    rmSync(dir, { recursive: true, force: true });
    raw.close();
  });

  it("idempotent : ne recrée pas un simulateur existant", () => {
    const { db, raw } = createDb({ url: ":memory:", enableWal: false });
    runMigrations(raw);
    const service = new SimulatorService(db);

    const dir = makeTempDir();
    writeFileSync(join(dir, "a.json"), JSON.stringify(minimalSim("sim-a")));

    seedCorpus(service, { directories: [dir] });
    const second = seedCorpus(service, { directories: [dir] });
    expect(second.created).toEqual([]);
    expect(second.skipped).toEqual(["sim-a"]);

    rmSync(dir, { recursive: true, force: true });
    raw.close();
  });

  it("collecte les erreurs sur JSON invalide ou Zod KO sans crasher", () => {
    const { db, raw } = createDb({ url: ":memory:", enableWal: false });
    runMigrations(raw);
    const service = new SimulatorService(db);

    const dir = makeTempDir();
    writeFileSync(join(dir, "bad.json"), "not valid json{");
    writeFileSync(join(dir, "wrong-schema.json"), JSON.stringify({ schemaVersion: 99 }));
    writeFileSync(join(dir, "good.json"), JSON.stringify(minimalSim("sim-good")));

    const result = seedCorpus(service, { directories: [dir] });
    expect(result.created).toEqual(["sim-good"]);
    expect(result.errors).toHaveLength(2);

    rmSync(dir, { recursive: true, force: true });
    raw.close();
  });

  it("skip silencieusement les dossiers inexistants", () => {
    const { db, raw } = createDb({ url: ":memory:", enableWal: false });
    runMigrations(raw);
    const service = new SimulatorService(db);

    const result = seedCorpus(service, { directories: ["/dossier/inexistant"] });
    expect(result.created).toEqual([]);
    expect(result.errors).toEqual([]);
    raw.close();
  });
});
