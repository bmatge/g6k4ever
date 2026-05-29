import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

/**
 * Configuration de build LIBRARY du runtime (≠ du SPA `vite.config.ts`).
 *
 * Deux modes contrôlés par la variable d'env `G6K_RUNTIME_MODE` :
 *
 *   - `embedded` (défaut) : externalise React, react-dom, react-dsfr.
 *     Bundle minimal — assume que le portail hôte a déjà chargé DSFR.
 *     Objectif : ≤ 120kB gzipped (cf. CLAUDE.md §11).
 *
 *   - `standalone` : bundle React + react-dom (mais pas DSFR — chargé via CDN).
 *     Pour les déploiements indépendants sur des pages sans React.
 *
 * Le bundle est émis dans `dist/lib/{mode}/index.js`.
 */
const mode = process.env["G6K_RUNTIME_MODE"] === "standalone" ? "standalone" : "embedded";

const externalCommon = ["@codegouvfr/react-dsfr", /^@codegouvfr\/react-dsfr\/.*/];
const externalEmbedded = [
  "react",
  "react-dom",
  "react/jsx-runtime",
  "react/jsx-dev-runtime",
  ...externalCommon,
];

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: `dist/lib/${mode}`,
    sourcemap: true,
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: () => "index.js",
    },
    rollupOptions: {
      external: mode === "embedded" ? externalEmbedded : externalCommon,
      output: {
        // Préfix interne pour éviter les conflits si l'hôte a aussi du React
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
    minify: "esbuild",
    target: "es2022",
    cssCodeSplit: false,
  },
});
