import { Hono } from "hono";
import type { LockService } from "../services/lock-service.js";

const USER_HEADER = "x-user-id";

export function lockRoutes(locks: LockService): Hono {
  const app = new Hono();

  /**
   * POST /simulators/:slug/lock?force=true — acquiert le verrou.
   * Réponses :
   *   200 acquired
   *   404 not-found
   *   423 held-by-other (le détenteur courant est renvoyé)
   */
  app.post("/:slug/lock", (c) => {
    const slug = c.req.param("slug");
    const userId = c.req.header(USER_HEADER);
    if (!userId) return c.json({ error: "Header X-User-Id requis." }, 401);
    const force = c.req.query("force") === "true";
    const outcome = locks.acquire(slug, userId, force);
    switch (outcome.status) {
      case "acquired":
        return c.json({ status: "acquired", lock: outcome.lock });
      case "held-by-other":
        return c.json(
          { status: "held-by-other", heldBy: outcome.heldBy, expiresAt: outcome.expiresAt },
          423,
        );
      case "not-found":
        return c.json({ error: "not-found" }, 404);
    }
  });

  /**
   * POST /simulators/:slug/lock/heartbeat — prolonge le TTL.
   */
  app.post("/:slug/lock/heartbeat", (c) => {
    const slug = c.req.param("slug");
    const userId = c.req.header(USER_HEADER);
    if (!userId) return c.json({ error: "Header X-User-Id requis." }, 401);
    const outcome = locks.heartbeat(slug, userId);
    switch (outcome.status) {
      case "acquired":
        return c.json({ status: "renewed", lock: outcome.lock });
      case "held-by-other":
        return c.json(
          { status: "held-by-other", heldBy: outcome.heldBy, expiresAt: outcome.expiresAt },
          423,
        );
      case "not-found":
        return c.json({ error: "not-found" }, 404);
    }
  });

  /**
   * DELETE /simulators/:slug/lock?force=true — libère le verrou.
   */
  app.delete("/:slug/lock", (c) => {
    const slug = c.req.param("slug");
    const userId = c.req.header(USER_HEADER);
    if (!userId) return c.json({ error: "Header X-User-Id requis." }, 401);
    const force = c.req.query("force") === "true";
    const outcome = locks.release(slug, userId, force);
    switch (outcome.status) {
      case "released":
        return c.json({ status: "released" });
      case "held-by-other":
        return c.json({ status: "held-by-other", heldBy: outcome.heldBy }, 423);
      case "not-locked":
        return c.json({ status: "not-locked" }, 200);
      case "not-found":
        return c.json({ error: "not-found" }, 404);
    }
  });

  return app;
}
