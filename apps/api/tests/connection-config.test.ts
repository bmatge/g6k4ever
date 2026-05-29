import { describe, it, expect } from "vitest";
import { loadConnectionConfigFromEnv } from "../src/index.js";

describe("loadConnectionConfigFromEnv", () => {
  it("ignore les vars non-pertinentes", () => {
    const config = loadConnectionConfigFromEnv({
      PATH: "/usr/bin",
      HOME: "/home/me",
    });
    expect(config.databases).toEqual({});
  });

  it("extrait les vars G6K4EVER_DB_*", () => {
    const config = loadConnectionConfigFromEnv({
      G6K4EVER_DB_main: "sqlite:///data/main.db",
      G6K4EVER_DB_g6k_tlv: "sqlite:///data/tlv.db?rw=1",
      OTHER: "ignored",
    });
    expect(config.databases).toEqual({
      main: "sqlite:///data/main.db",
      "g6k-tlv": "sqlite:///data/tlv.db?rw=1",
    });
  });

  it("lit G6K4EVER_API_LRU_MAX", () => {
    const config = loadConnectionConfigFromEnv({
      G6K4EVER_API_LRU_MAX: "1000",
    });
    expect(config.apiCacheMaxEntries).toBe(1000);
  });

  it("apiCacheMaxEntries undefined si non défini", () => {
    const config = loadConnectionConfigFromEnv({});
    expect(config.apiCacheMaxEntries).toBeUndefined();
  });
});
