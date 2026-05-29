#!/usr/bin/env node
/**
 * Mesure le poids gzipped des bundles produits par vite.lib.config.ts.
 *
 * Usage :
 *   node scripts/measure-bundle.mjs [embedded|standalone]
 *
 * Sortie : tableau ASCII avec taille brute, gzipped (niveau 9), et indication
 * si on est sous le budget de 120kB gz (CLAUDE.md §11).
 *
 * Exit code : 0 si tout est sous budget, 1 sinon (utile en CI).
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { resolve, join } from "node:path";

const BUDGET_BYTES_GZ = 120 * 1024;
const mode = process.argv[2] ?? "embedded";
const distDir = resolve(`dist/lib/${mode}`);

if (!existsSync(distDir)) {
  console.error(`✗ ${distDir} n'existe pas. Lancer d'abord : pnpm build:lib:${mode}`);
  process.exit(2);
}

const files = walk(distDir).filter((f) => /\.(js|css)$/.test(f) && !f.endsWith(".map"));

let totalRaw = 0;
let totalGz = 0;
const rows = [];

for (const file of files) {
  const buf = readFileSync(file);
  const raw = buf.length;
  const gz = gzipSync(buf, { level: 9 }).length;
  totalRaw += raw;
  totalGz += gz;
  rows.push({
    name: file.replace(distDir + "/", ""),
    raw,
    gz,
  });
}

rows.sort((a, b) => b.gz - a.gz);

const padR = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);
const kb = (n) => (n / 1024).toFixed(1) + " kB";

console.log("");
console.log(`📦 @g6k4ever/runtime — bundle ${mode}`);
console.log("");
console.log(`  ${padR("Fichier", 36)} ${padL("Raw", 10)} ${padL("Gzipped", 10)}`);
console.log("  " + "─".repeat(36) + " " + "─".repeat(10) + " " + "─".repeat(10));
for (const r of rows) {
  console.log(`  ${padR(r.name, 36)} ${padL(kb(r.raw), 10)} ${padL(kb(r.gz), 10)}`);
}
console.log("  " + "─".repeat(36) + " " + "─".repeat(10) + " " + "─".repeat(10));
console.log(`  ${padR("TOTAL", 36)} ${padL(kb(totalRaw), 10)} ${padL(kb(totalGz), 10)}`);
console.log("");

const overBudget = totalGz > BUDGET_BYTES_GZ;
const status = overBudget ? "✗ AU-DESSUS du budget" : "✓ sous budget";
console.log(
  `  Budget : ${kb(BUDGET_BYTES_GZ)} gzipped — ${status} (${overBudget ? "+" : "-"}${kb(Math.abs(BUDGET_BYTES_GZ - totalGz))})`,
);
console.log("");

process.exit(overBudget ? 1 : 0);

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}
