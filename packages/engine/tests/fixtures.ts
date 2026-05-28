import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Simulator, type Simulator as TSimulator } from "@g6k4ever/schema";

const __dirname = dirname(fileURLToPath(import.meta.url));
const examplesDir = resolve(__dirname, "..", "..", "schema", "examples");

export function loadSimulator(name: string): TSimulator {
  const path = resolve(examplesDir, `${name}.json`);
  const raw = JSON.parse(readFileSync(path, "utf-8")) as unknown;
  const result = Simulator.safeParse(raw);
  if (!result.success) {
    throw new Error(`Fixture invalide ${name}.json: ${JSON.stringify(result.error.format(), null, 2)}`);
  }
  return result.data;
}
