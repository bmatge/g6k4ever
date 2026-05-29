import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Database from "better-sqlite3";
import { SqliteDatabaseProvider, compileQuery } from "../src/index.js";

describe("compileQuery — G6K placeholders → SQLite ?", () => {
  it("convertit %1$s en ? et binde la valeur", () => {
    const { sql, bindValues } = compileQuery(
      {
        kind: "database",
        id: "test",
        label: "T",
        connectionId: "c",
        query: "SELECT * FROM t WHERE x = %1$s",
        parameters: [{ name: "x", type: "text", position: 1 }],
        columns: [{ name: "x", type: "text" }],
      },
      { x: "abc" },
    );
    expect(sql).toBe("SELECT * FROM t WHERE x = ?");
    expect(bindValues).toEqual(["abc"]);
  });

  it("convertit plusieurs placeholders dans l'ordre des positions", () => {
    const { sql, bindValues } = compileQuery(
      {
        kind: "database",
        id: "test",
        label: "T",
        connectionId: "c",
        query: "SELECT * FROM t WHERE x = %1$s AND y = %2$d",
        parameters: [
          { name: "x", type: "text", position: 1 },
          { name: "y", type: "integer", position: 2 },
        ],
        columns: [{ name: "x", type: "text" }],
      },
      { x: "abc", y: 42 },
    );
    expect(sql).toBe("SELECT * FROM t WHERE x = ? AND y = ?");
    expect(bindValues).toEqual(["abc", 42]);
  });
});

describe("SqliteDatabaseProvider — vraie connexion DB", () => {
  const dbPath = ":memory:";
  let setupDb: Database.Database;

  beforeAll(() => {
    // Setup : crée une DB en mémoire et populate une table de test.
    // Note : la DB en mémoire n'est PAS partagée entre connexions, donc
    // pour ce test on utilise un fichier temp partagé.
  });

  afterAll(() => {
    setupDb?.close();
  });

  it("résout une ligne via paramètres positionnels", () => {
    // Strategy : créer la DB et la peupler dans le provider directement.
    // Pour ce test on accepte que le provider crée la DB en mémoire et la
    // peuple avant d'interroger.
    const provider = new SqliteDatabaseProvider(":memory:", { readOnly: false });
    // Setup la table directement via une query SQL synchrone (better-sqlite3
    // est sync, mais le provider n'expose pas l'instance interne — on utilise
    // une approche alternative : un fichier temp partagé).
    provider.close();

    // Approche alternative : on utilise un fichier temp.
    const tmpDb = `/tmp/g6k4ever-test-${Date.now()}.db`;
    const setup = new Database(tmpDb);
    setup.exec(`
      CREATE TABLE communes (
        insee TEXT PRIMARY KEY,
        nom TEXT NOT NULL,
        zone INTEGER NOT NULL,
        frais INTEGER NOT NULL
      );
      INSERT INTO communes (insee, nom, zone, frais) VALUES
        ('75056', 'Paris', 2, 2),
        ('35238', 'Rennes', 1, 1),
        ('48095', 'Mende', 0, 0);
    `);
    setup.close();

    const realProvider = new SqliteDatabaseProvider(tmpDb, { readOnly: true });
    const row = realProvider.query(
      {
        kind: "database",
        id: "test",
        label: "T",
        connectionId: "c",
        query: "SELECT nom, frais FROM communes WHERE insee = %1$s",
        parameters: [{ name: "insee", type: "text", position: 1 }],
        columns: [
          { name: "nom", type: "text" },
          { name: "frais", type: "integer" },
        ],
      },
      { insee: "35238" },
    );

    expect(row).toEqual({ nom: "Rennes", frais: 1 });

    // Cleanup
    realProvider.close();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("node:fs") as typeof import("node:fs");
    fs.unlinkSync(tmpDb);
  });
});
