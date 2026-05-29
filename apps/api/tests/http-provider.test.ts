import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HttpApiProvider } from "../src/index.js";

const baseSource = {
  kind: "api" as const,
  id: "test-api",
  label: "Test API",
  uri: "https://example.com/data",
  method: "GET" as const,
  parameters: [],
  cacheTTLSeconds: 60,
};

describe("HttpApiProvider — cache LRU + TTL", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("call() retourne null si rien n'est caché", () => {
    const provider = new HttpApiProvider();
    expect(provider.call(baseSource, { x: "1" })).toBeNull();
  });

  it("prefetch() populate le cache, call() le sert", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ value: 42, name: "Paris" }),
    });
    const provider = new HttpApiProvider();
    const fetched = await provider.prefetch(baseSource, { codeInsee: "75056" });
    expect(fetched).toEqual({ value: 42, name: "Paris" });
    expect(provider.call(baseSource, { codeInsee: "75056" })).toEqual({ value: 42, name: "Paris" });
  });

  it("respecte le TTL (0 = pas de cache)", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ x: 1 }),
    });
    const provider = new HttpApiProvider();
    const noCacheSource = { ...baseSource, cacheTTLSeconds: 0 };
    await provider.prefetch(noCacheSource, { x: "a" });
    // Le cache est vide → call() retourne null
    expect(provider.call(noCacheSource, { x: "a" })).toBeNull();
  });

  it("éviction LRU au-delà de maxEntries", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ x: 1 }),
    });
    const provider = new HttpApiProvider({ maxEntries: 2 });
    await provider.prefetch(baseSource, { k: "a" });
    await provider.prefetch(baseSource, { k: "b" });
    await provider.prefetch(baseSource, { k: "c" });
    // "a" a été évincée
    expect(provider.call(baseSource, { k: "a" })).toBeNull();
    expect(provider.call(baseSource, { k: "b" })).not.toBeNull();
    expect(provider.call(baseSource, { k: "c" })).not.toBeNull();
  });

  it("returnPath project une clé imbriquée", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { result: { value: "ok" } } }),
    });
    const provider = new HttpApiProvider();
    const source = { ...baseSource, returnPath: "data.result" };
    const v = await provider.prefetch(source, {});
    expect(v).toEqual({ value: "ok" });
  });

  it("fetch en erreur → null sans crasher", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });
    const provider = new HttpApiProvider();
    const v = await provider.prefetch(baseSource, {});
    expect(v).toBeNull();
  });
});
