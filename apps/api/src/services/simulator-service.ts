import { eq, desc } from "drizzle-orm";
import type { Simulator } from "@g6k4ever/schema";
import { Simulator as SimulatorSchema } from "@g6k4ever/schema";
import type { Db } from "../db/client.js";
import { simulators, type SimulatorRow } from "../db/schema.js";

/**
 * Vue publique d'un simulateur (sans le draft_definition en cas de listing).
 */
export interface SimulatorSummary {
  id: number;
  slug: string;
  label: string;
  schemaVersion: number;
  hasPublished: boolean;
  createdAt: number;
  updatedAt: number;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface SimulatorDetail extends SimulatorSummary {
  draftDefinition: Simulator;
  publishedDefinition: Simulator | null;
}

export class SimulatorService {
  constructor(private readonly db: Db) {}

  list(): SimulatorSummary[] {
    const rows = this.db
      .select()
      .from(simulators)
      .orderBy(desc(simulators.updatedAt))
      .all();
    return rows.map((row) => this.rowToSummary(row));
  }

  getBySlug(slug: string): SimulatorDetail | null {
    const row = this.db.select().from(simulators).where(eq(simulators.slug, slug)).get();
    return row ? this.rowToDetail(row) : null;
  }

  create(definition: Simulator, userId: string | null): SimulatorDetail {
    const now = Date.now();
    const inserted = this.db
      .insert(simulators)
      .values({
        slug: definition.metadata.name,
        draftDefinition: JSON.stringify(definition),
        publishedDefinition: null,
        schemaVersion: definition.schemaVersion,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning()
      .get();
    return this.rowToDetail(inserted);
  }

  updateDraft(slug: string, definition: Simulator, userId: string | null): SimulatorDetail | null {
    const current = this.db.select().from(simulators).where(eq(simulators.slug, slug)).get();
    if (!current) return null;
    if (definition.metadata.name !== slug) {
      throw new Error(
        `Le slug de la définition (${definition.metadata.name}) ne correspond pas à l'URL (${slug}).`,
      );
    }
    const now = Date.now();
    const updated = this.db
      .update(simulators)
      .set({
        draftDefinition: JSON.stringify(definition),
        schemaVersion: definition.schemaVersion,
        updatedAt: now,
        updatedBy: userId,
      })
      .where(eq(simulators.id, current.id))
      .returning()
      .get();
    return this.rowToDetail(updated);
  }

  publish(slug: string, userId: string | null): SimulatorDetail | null {
    const current = this.db.select().from(simulators).where(eq(simulators.slug, slug)).get();
    if (!current) return null;
    const now = Date.now();
    const updated = this.db
      .update(simulators)
      .set({
        publishedDefinition: current.draftDefinition,
        updatedAt: now,
        updatedBy: userId,
      })
      .where(eq(simulators.id, current.id))
      .returning()
      .get();
    return this.rowToDetail(updated);
  }

  delete(slug: string): boolean {
    const result = this.db.delete(simulators).where(eq(simulators.slug, slug)).run();
    return result.changes > 0;
  }

  private parseDefinition(json: string): Simulator {
    const raw = JSON.parse(json) as unknown;
    const parsed = SimulatorSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`Définition stockée invalide: ${parsed.error.message}`);
    }
    return parsed.data;
  }

  private rowToSummary(row: SimulatorRow): SimulatorSummary {
    const draft = this.parseDefinition(row.draftDefinition);
    return {
      id: row.id,
      slug: row.slug,
      label: draft.metadata.label,
      schemaVersion: row.schemaVersion,
      hasPublished: row.publishedDefinition !== null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      createdBy: row.createdBy,
      updatedBy: row.updatedBy,
    };
  }

  private rowToDetail(row: SimulatorRow): SimulatorDetail {
    const draft = this.parseDefinition(row.draftDefinition);
    const published = row.publishedDefinition
      ? this.parseDefinition(row.publishedDefinition)
      : null;
    return {
      id: row.id,
      slug: row.slug,
      label: draft.metadata.label,
      schemaVersion: row.schemaVersion,
      hasPublished: row.publishedDefinition !== null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      createdBy: row.createdBy,
      updatedBy: row.updatedBy,
      draftDefinition: draft,
      publishedDefinition: published,
    };
  }
}
