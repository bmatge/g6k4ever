import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClient, ApiError } from "../src/api-client.js";

/**
 * Tests du client API — focus verrou F9.5 : les méthodes de lock renvoient un
 * statut structuré quand l'API répond 423 (Locked), au lieu de lever une
 * `ApiError`. Les autres statuts d'erreur continuent de lever.
 */

function mockFetchOnce(status: number, body: unknown): ReturnType<typeof vi.fn> {
  const fn = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

const client = new ApiClient({ baseUrl: "http://api.test", userId: "alice" });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ApiClient.acquireLock", () => {
  it("renvoie { status: 'acquired' } sur 200", async () => {
    const lock = { simulatorId: 1, userId: "alice", acquiredAt: 1000, expiresAt: 2000 };
    mockFetchOnce(200, { status: "acquired", lock });
    const res = await client.acquireLock("demo");
    expect(res).toEqual({ status: "acquired", lock });
  });

  it("renvoie { status: 'held-by-other' } sur 423 — sans lever d'exception", async () => {
    mockFetchOnce(423, { status: "held-by-other", heldBy: "bob", expiresAt: 9000 });
    const res = await client.acquireLock("demo");
    expect(res).toEqual({ status: "held-by-other", heldBy: "bob", expiresAt: 9000 });
  });

  it("passe force=true dans la query string", async () => {
    const fetchMock = mockFetchOnce(200, { status: "acquired", lock: {} });
    await client.acquireLock("demo", true);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/simulators/demo/lock?force=true",
      expect.anything(),
    );
  });

  it("lève toujours une ApiError sur 404", async () => {
    mockFetchOnce(404, { error: "not-found" });
    await expect(client.acquireLock("inconnu")).rejects.toThrowError(ApiError);
    await expect(client.acquireLock("inconnu")).rejects.toMatchObject({ status: 404 });
  });

  it("lève toujours une ApiError sur 401", async () => {
    mockFetchOnce(401, { error: "Header X-User-Id requis." });
    await expect(client.acquireLock("demo")).rejects.toMatchObject({ status: 401 });
  });
});

describe("ApiClient.heartbeatLock", () => {
  it("renvoie { status: 'renewed' } sur 200", async () => {
    const lock = { simulatorId: 1, userId: "alice", acquiredAt: 1000, expiresAt: 3000 };
    mockFetchOnce(200, { status: "renewed", lock });
    const res = await client.heartbeatLock("demo");
    expect(res).toEqual({ status: "renewed", lock });
  });

  it("renvoie { status: 'held-by-other' } sur 423 (verrou repris de force)", async () => {
    mockFetchOnce(423, { status: "held-by-other", heldBy: "bob", expiresAt: 9000 });
    const res = await client.heartbeatLock("demo");
    expect(res).toEqual({ status: "held-by-other", heldBy: "bob", expiresAt: 9000 });
  });
});

describe("ApiClient.releaseLock", () => {
  it("renvoie { status: 'released' } sur 200", async () => {
    mockFetchOnce(200, { status: "released" });
    const res = await client.releaseLock("demo");
    expect(res).toEqual({ status: "released" });
  });

  it("renvoie { status: 'held-by-other' } sur 423 — sans lever d'exception", async () => {
    mockFetchOnce(423, { status: "held-by-other", heldBy: "bob" });
    const res = await client.releaseLock("demo");
    expect(res).toEqual({ status: "held-by-other", heldBy: "bob" });
  });
});
