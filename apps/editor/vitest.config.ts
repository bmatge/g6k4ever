import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "editor",
    include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
    environment: "jsdom",
  },
});
