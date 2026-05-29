import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Simulator as SimulatorSchema } from "@g6k4ever/schema";
import type { SimulatorService } from "./services/simulator-service.js";

/**
 * Seed idempotent du corpus.
 *
 * Walke récursivement les sous-dossiers passés (typiquement `_corpus/g6k/` et
 * `_corpus/portail-elec/`) et crée les simulateurs qui n'existent pas encore en DB.
 * Les `.xml` sont ignorés (G6K legacy, pas encore portés).
 *
 * Retourne la liste des slugs créés/mis à jour pour les logs au démarrage.
 */
export interface SeedOptions {
  /** Liste de répertoires contenant des `.json` Simulator valides. */
  directories: string[];
  /** Auteur attribué aux simulateurs créés. */
  seedUser?: string;
  log?: (msg: string) => void;
}

export function seedCorpus(
  service: SimulatorService,
  options: SeedOptions,
): { created: string[]; skipped: string[]; errors: Array<{ file: string; error: string }> } {
  const created: string[] = [];
  const skipped: string[] = [];
  const errors: Array<{ file: string; error: string }> = [];
  const log = options.log ?? (() => undefined);

  for (const dir of options.directories) {
    if (!existsSync(dir)) {
      log(`[seed] skip — ${dir} introuvable`);
      continue;
    }
    const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      const fullPath = join(dir, file);
      try {
        const raw = JSON.parse(readFileSync(fullPath, "utf-8")) as unknown;
        const parsed = SimulatorSchema.safeParse(raw);
        if (!parsed.success) {
          errors.push({ file: fullPath, error: parsed.error.message });
          continue;
        }
        const slug = parsed.data.metadata.name;
        const existing = service.getBySlug(slug);
        if (existing) {
          skipped.push(slug);
          continue;
        }
        service.create(parsed.data, options.seedUser ?? "seed");
        created.push(slug);
        log(`[seed] créé ${slug} ← ${file}`);
      } catch (err) {
        errors.push({
          file: fullPath,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return { created, skipped, errors };
}
