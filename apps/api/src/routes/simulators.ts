import { Hono } from "hono";
import { Simulator } from "@g6k4ever/schema";
import type { SimulatorService } from "../services/simulator-service.js";
import type { LockService } from "../services/lock-service.js";

const USER_HEADER = "x-user-id";

function readUserId(c: { req: { header: (name: string) => string | undefined } }): string | null {
  return c.req.header(USER_HEADER) ?? null;
}

export function simulatorsRoutes(
  service: SimulatorService,
  locks: LockService,
): Hono {
  const app = new Hono();

  /**
   * GET /simulators — liste résumée.
   */
  app.get("/", (c) => c.json({ simulators: service.list() }));

  /**
   * POST /simulators — crée un nouveau simulateur depuis sa définition.
   * Body : Simulator (Zod-validated). Le slug est tiré de `metadata.name`.
   */
  app.post("/", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Body JSON invalide" }, 400);
    }
    const parsed = Simulator.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Simulateur invalide", details: parsed.error.format() }, 400);
    }
    try {
      const created = service.create(parsed.data, readUserId(c));
      return c.json({ simulator: created }, 201);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Conflit (slug unique).
      return c.json({ error: message }, 409);
    }
  });

  /**
   * GET /simulators/:slug?version=draft|published
   */
  app.get("/:slug", (c) => {
    const slug = c.req.param("slug");
    const detail = service.getBySlug(slug);
    if (!detail) return c.json({ error: "not-found" }, 404);
    const version = c.req.query("version");
    if (version === "published") {
      if (!detail.publishedDefinition) {
        return c.json({ error: "Aucune version publiée pour ce simulateur." }, 404);
      }
      return c.json({ simulator: { ...detail, draftDefinition: undefined } });
    }
    return c.json({ simulator: detail });
  });

  /**
   * PUT /simulators/:slug — met à jour la définition brouillon.
   * Nécessite que l'appelant détienne le lock (ou qu'aucun lock ne soit posé).
   */
  app.put("/:slug", async (c) => {
    const slug = c.req.param("slug");
    const userId = readUserId(c);
    if (!userId) {
      return c.json({ error: "Header X-User-Id requis pour modifier." }, 401);
    }
    const canWrite = locks.canWrite(slug, userId);
    if (!canWrite.allowed) {
      if (canWrite.reason === "not-found") return c.json({ error: "not-found" }, 404);
      return c.json(
        { error: "Verrou détenu par un autre utilisateur.", heldBy: canWrite.heldBy },
        423,
      );
    }
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Body JSON invalide" }, 400);
    }
    const parsed = Simulator.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Simulateur invalide", details: parsed.error.format() }, 400);
    }
    try {
      const updated = service.updateDraft(slug, parsed.data, userId);
      if (!updated) return c.json({ error: "not-found" }, 404);
      return c.json({ simulator: updated });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ error: message }, 400);
    }
  });

  /**
   * DELETE /simulators/:slug
   */
  app.delete("/:slug", (c) => {
    const slug = c.req.param("slug");
    const deleted = service.delete(slug);
    if (!deleted) return c.json({ error: "not-found" }, 404);
    return c.body(null, 204);
  });

  /**
   * POST /simulators/:slug/publish — promeut le brouillon en version publiée.
   */
  app.post("/:slug/publish", (c) => {
    const slug = c.req.param("slug");
    const userId = readUserId(c);
    if (!userId) return c.json({ error: "Header X-User-Id requis." }, 401);
    const canWrite = locks.canWrite(slug, userId);
    if (!canWrite.allowed) {
      if (canWrite.reason === "not-found") return c.json({ error: "not-found" }, 404);
      return c.json(
        { error: "Verrou détenu par un autre utilisateur.", heldBy: canWrite.heldBy },
        423,
      );
    }
    const result = service.publish(slug, userId);
    if (!result) return c.json({ error: "not-found" }, 404);
    return c.json({ simulator: result });
  });

  return app;
}
