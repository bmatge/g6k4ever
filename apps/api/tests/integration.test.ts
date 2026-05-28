import { describe, it, expect, beforeEach } from "vitest";
import {
  createApp,
  createDb,
  runMigrations,
  emptyProviderRegistry,
  MockDatabaseProvider,
} from "../src/index.js";
import type { Db } from "../src/index.js";
import type { Hono } from "hono";

const testSimulator = {
  schemaVersion: 1,
  metadata: {
    name: "tlv-test",
    label: "Test TLV",
    defaultLocale: "fr-FR",
    dateFormat: "dd/MM/yyyy",
    authors: [],
  },
  outputKind: "decision" as const,
  data: [
    { id: 1, name: "codeInsee", label: "Code INSEE", type: "text" as const },
    {
      id: 2,
      name: "tlvApplicable",
      label: "TLV applicable",
      type: "text" as const,
      source: { sourceId: "tlv-db", returnPath: "Ok" },
    },
  ],
  sources: [
    {
      kind: "database" as const,
      id: "tlv-db",
      label: "TLV connexion",
      connectionId: "g6k-tlv",
      query: "SELECT Ok FROM PlusDe50000 WHERE codeInsee = %1$s",
      parameters: [{ name: "codeInsee", type: "text" as const, position: 1, bindToDataId: 1 }],
      columns: [
        { name: "codeInsee", type: "text" as const },
        { name: "Ok", type: "text" as const },
      ],
    },
  ],
  steps: [{ id: 1, name: "step", label: "Step", blocks: [] }],
  rules: [
    {
      id: "R1",
      name: "Visibilité du résultat",
      conditions: { kind: "condition" as const, operand: 2, operator: "present" as const },
      ifActions: [
        { kind: "showObject" as const, target: { type: "blockinfo" as const, id: "result" } },
      ],
      elseActions: [
        { kind: "hideObject" as const, target: { type: "blockinfo" as const, id: "result" } },
      ],
    },
  ],
  footnotes: [],
};

function makeApp(): { app: Hono; closeDb: () => void; db: Db; mockDb: MockDatabaseProvider } {
  const { db, raw } = createDb({ url: ":memory:", enableWal: false });
  runMigrations(raw);
  const providers = emptyProviderRegistry();
  const mockDb = new MockDatabaseProvider();
  mockDb.setData(
    [
      { codeInsee: "75056", Ok: "1" },
      { codeInsee: "13055", Ok: "1" },
    ],
    (row, params) => row.codeInsee === params.codeInsee,
  );
  providers.databases.set("g6k-tlv", mockDb);
  const { app, closeDb } = createApp({ db, providers });
  return { app, closeDb: () => { closeDb(); raw.close(); }, db, mockDb };
}

describe("API — CRUD /simulators", () => {
  let app: Hono;
  let close: () => void;

  beforeEach(() => {
    const made = makeApp();
    app = made.app;
    close = made.closeDb;
  });

  it("liste vide au démarrage", async () => {
    const res = await app.request("/simulators");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ simulators: [] });
    close();
  });

  it("crée puis récupère un simulateur", async () => {
    const create = await app.request("/simulators", {
      method: "POST",
      headers: { "content-type": "application/json", "x-user-id": "alice" },
      body: JSON.stringify(testSimulator),
    });
    expect(create.status).toBe(201);
    const created = (await create.json()) as {
      simulator: { slug: string; hasPublished: boolean; createdBy: string | null };
    };
    expect(created.simulator.slug).toBe("tlv-test");
    expect(created.simulator.hasPublished).toBe(false);
    expect(created.simulator.createdBy).toBe("alice");

    const get = await app.request("/simulators/tlv-test");
    expect(get.status).toBe(200);
    const fetched = (await get.json()) as {
      simulator: { draftDefinition: { metadata: { name: string } } };
    };
    expect(fetched.simulator.draftDefinition.metadata.name).toBe("tlv-test");
    close();
  });

  it("refuse une création avec définition invalide", async () => {
    const res = await app.request("/simulators", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ schemaVersion: 99 }),
    });
    expect(res.status).toBe(400);
    close();
  });

  it("refuse une création en double (slug unique)", async () => {
    await app.request("/simulators", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(testSimulator),
    });
    const dup = await app.request("/simulators", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(testSimulator),
    });
    expect(dup.status).toBe(409);
    close();
  });

  it("PUT sans X-User-Id → 401", async () => {
    await app.request("/simulators", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(testSimulator),
    });
    const res = await app.request("/simulators/tlv-test", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(testSimulator),
    });
    expect(res.status).toBe(401);
    close();
  });

  it("DELETE retire le simulateur", async () => {
    await app.request("/simulators", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(testSimulator),
    });
    const del = await app.request("/simulators/tlv-test", { method: "DELETE" });
    expect(del.status).toBe(204);
    const get = await app.request("/simulators/tlv-test");
    expect(get.status).toBe(404);
    close();
  });
});

describe("API — Lock", () => {
  it("alice acquiert, bob refusé, alice release, bob acquiert", async () => {
    const { app, closeDb } = makeApp();
    await app.request("/simulators", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(testSimulator),
    });
    // alice acquires
    const a = await app.request("/simulators/tlv-test/lock", {
      method: "POST",
      headers: { "x-user-id": "alice" },
    });
    expect(a.status).toBe(200);
    expect(((await a.json()) as { status: string }).status).toBe("acquired");

    // bob refused
    const b = await app.request("/simulators/tlv-test/lock", {
      method: "POST",
      headers: { "x-user-id": "bob" },
    });
    expect(b.status).toBe(423);
    expect(((await b.json()) as { heldBy: string }).heldBy).toBe("alice");

    // alice release
    const r = await app.request("/simulators/tlv-test/lock", {
      method: "DELETE",
      headers: { "x-user-id": "alice" },
    });
    expect(r.status).toBe(200);

    // bob acquires
    const b2 = await app.request("/simulators/tlv-test/lock", {
      method: "POST",
      headers: { "x-user-id": "bob" },
    });
    expect(b2.status).toBe(200);

    // force takeover : alice prend de force
    const f = await app.request("/simulators/tlv-test/lock?force=true", {
      method: "POST",
      headers: { "x-user-id": "alice" },
    });
    expect(f.status).toBe(200);
    closeDb();
  });

  it("PUT bloqué si lock détenu par un autre", async () => {
    const { app, closeDb } = makeApp();
    await app.request("/simulators", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(testSimulator),
    });
    await app.request("/simulators/tlv-test/lock", {
      method: "POST",
      headers: { "x-user-id": "alice" },
    });
    const res = await app.request("/simulators/tlv-test", {
      method: "PUT",
      headers: { "content-type": "application/json", "x-user-id": "bob" },
      body: JSON.stringify({ ...testSimulator, metadata: { ...testSimulator.metadata, label: "Bob's edit" } }),
    });
    expect(res.status).toBe(423);
    closeDb();
  });
});

describe("API — Publish", () => {
  it("le brouillon devient la version publiée", async () => {
    const { app, closeDb } = makeApp();
    await app.request("/simulators", {
      method: "POST",
      headers: { "content-type": "application/json", "x-user-id": "alice" },
      body: JSON.stringify(testSimulator),
    });
    const pub = await app.request("/simulators/tlv-test/publish", {
      method: "POST",
      headers: { "x-user-id": "alice" },
    });
    expect(pub.status).toBe(200);
    const body = (await pub.json()) as { simulator: { hasPublished: boolean } };
    expect(body.simulator.hasPublished).toBe(true);

    const get = await app.request("/simulators/tlv-test?version=published");
    expect(get.status).toBe(200);
    closeDb();
  });

  it("404 si aucune version publiée", async () => {
    const { app, closeDb } = makeApp();
    await app.request("/simulators", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(testSimulator),
    });
    const res = await app.request("/simulators/tlv-test?version=published");
    expect(res.status).toBe(404);
    closeDb();
  });
});

describe("API — POST /simulators/:slug/run avec datasource `database` (mock provider)", () => {
  it("Paris → TLV applicable (Ok=1)", async () => {
    const { app, closeDb } = makeApp();
    await app.request("/simulators", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(testSimulator),
    });
    const run = await app.request("/simulators/tlv-test/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ input: { codeInsee: "75056" } }),
    });
    expect(run.status).toBe(200);
    const body = (await run.json()) as {
      state: { values: Record<string, unknown>; visibility: Record<string, boolean>; stable: boolean };
    };
    expect(body.state.stable).toBe(true);
    expect(body.state.values["2"]).toBe("1");
    expect(body.state.visibility["blockinfo:result"]).toBe(true);
    closeDb();
  });

  it("commune inconnue → source renvoie null → blockinfo masqué", async () => {
    const { app, closeDb } = makeApp();
    await app.request("/simulators", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(testSimulator),
    });
    const run = await app.request("/simulators/tlv-test/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ input: { codeInsee: "99999" } }),
    });
    expect(run.status).toBe(200);
    const body = (await run.json()) as {
      state: { visibility: Record<string, boolean> };
    };
    expect(body.state.visibility["blockinfo:result"]).toBe(false);
    closeDb();
  });
});
