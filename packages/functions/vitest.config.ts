import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "functions",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
  },
});
