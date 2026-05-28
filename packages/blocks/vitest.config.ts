import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "blocks",
    include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
    // node : on teste les schémas + helpers, pas le rendu DOM (qui sera couvert
    // par les tests d'intégration runtime/éditeur en Phase 6 et 7).
    environment: "node",
  },
});
