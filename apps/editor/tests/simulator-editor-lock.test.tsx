import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { Simulator } from "@g6k4ever/schema";
import type { ApiClient } from "../src/api-client.js";
import { SimulatorEditor } from "../src/pages/SimulatorEditor.js";

/**
 * F9.5 — le flot « verrou détenu par un autre » doit être vivant : quand
 * `acquireLock` renvoie `held-by-other`, l'éditeur passe en lecture seule,
 * affiche qui détient le verrou et propose de reprendre la main.
 * (Avant le fix, l'ApiError 423 court-circuitait tout : code mort.)
 */

const draft: Simulator = {
  schemaVersion: 1,
  metadata: {
    name: "demo",
    label: "Simulateur démo",
    defaultLocale: "fr-FR",
    dateFormat: "dd/MM/yyyy",
    authors: [],
  },
  outputKind: "decision",
  data: [],
  sources: [],
  steps: [{ id: 1, name: "step", label: "Step", blocks: [] }],
  rules: [],
  footnotes: [],
} as unknown as Simulator;

interface ApiStubOverrides {
  acquireLock?: ApiClient["acquireLock"];
}

function makeApiStub(overrides: ApiStubOverrides = {}): ApiClient {
  return {
    get: vi.fn().mockResolvedValue({ simulator: { draftDefinition: draft } }),
    acquireLock: vi
      .fn()
      .mockResolvedValue({ status: "held-by-other", heldBy: "alice", expiresAt: 9000 }),
    heartbeatLock: vi.fn().mockResolvedValue({ status: "renewed", lock: {} }),
    releaseLock: vi.fn().mockResolvedValue({ status: "released" }),
    ...overrides,
  } as unknown as ApiClient;
}

describe("<SimulatorEditor> — verrou détenu par un autre (F9.5)", () => {
  it("affiche l'alerte lecture seule avec le détenteur et désactive Enregistrer/Publier", async () => {
    render(<SimulatorEditor api={makeApiStub()} slug="demo" onClose={() => undefined} />);

    expect(
      await screen.findByText(/Quelqu'un d'autre édite ce simulateur \(alice\)/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Lecture seule — édité par alice/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reprendre la main/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Enregistrer le brouillon/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^Publier$/ })).toBeDisabled();
  });

  it("« Reprendre la main » force l'acquisition et repasse en édition", async () => {
    const acquireLock = vi
      .fn()
      .mockResolvedValueOnce({ status: "held-by-other", heldBy: "alice", expiresAt: 9000 })
      .mockResolvedValueOnce({
        status: "acquired",
        lock: { simulatorId: 1, userId: "moi", acquiredAt: 1, expiresAt: 9000 },
      });
    render(
      <SimulatorEditor
        api={makeApiStub({ acquireLock })}
        slug="demo"
        onClose={() => undefined}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: /Reprendre la main/ }));

    expect(await screen.findByText(/Verrou acquis/)).toBeInTheDocument();
    expect(acquireLock).toHaveBeenLastCalledWith("demo", true);
    expect(screen.getByRole("button", { name: /Enregistrer le brouillon/ })).toBeEnabled();
    expect(screen.queryByText(/Quelqu'un d'autre édite/)).not.toBeInTheDocument();
  });

  it("verrou libre : badge « Verrou acquis », pas d'alerte", async () => {
    const acquireLock = vi.fn().mockResolvedValue({
      status: "acquired",
      lock: { simulatorId: 1, userId: "moi", acquiredAt: 1, expiresAt: 9000 },
    });
    render(
      <SimulatorEditor
        api={makeApiStub({ acquireLock })}
        slug="demo"
        onClose={() => undefined}
      />,
    );

    expect(await screen.findByText(/Verrou acquis/)).toBeInTheDocument();
    expect(screen.queryByText(/Quelqu'un d'autre édite/)).not.toBeInTheDocument();
  });
});
